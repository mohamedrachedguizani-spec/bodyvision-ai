import mysql.connector
from mysql.connector import Error, pooling
import os
import urllib.parse
from dotenv import load_dotenv

load_dotenv()


# ──────────────────────────────────────────────────────────────
# Helpers : résolution des paramètres de connexion
# Supporte CLEARDB_DATABASE_URL (Heroku) et les variables
# DB_HOST / DB_NAME / DB_USER / DB_PASSWORD (local / autres).
# ──────────────────────────────────────────────────────────────

def _parse_db_config() -> dict:
    """
    Retourne un dict de config MySQL.
    Priorité : CLEARDB_DATABASE_URL > variables DB_* individuelles.
    ClearDB URL format : mysql://user:password@host/dbname?reconnect=true
    """
    cleardb_url = os.getenv("CLEARDB_DATABASE_URL") or os.getenv("DATABASE_URL")
    if cleardb_url:
        parsed = urllib.parse.urlparse(cleardb_url)
        db_name = parsed.path.lstrip("/").split("?")[0]
        print(f"🔗 ClearDB détecté → host={parsed.hostname}, db={db_name}")
        return {
            "host": parsed.hostname,
            "port": parsed.port or 3306,
            "database": db_name,
            "user": parsed.username,
            "password": parsed.password or "",
        }
    return {
        "host": os.getenv("DB_HOST", "localhost"),
        "port": int(os.getenv("DB_PORT", "3306")),
        "database": os.getenv("DB_NAME", "bodyvision_ai"),
        "user": os.getenv("DB_USER", "root"),
        "password": os.getenv("DB_PASSWORD", ""),
    }


# ──────────────────────────────────────────────────────────────
# Connection Pool — réutilise les connexions au lieu d'en créer
# une nouvelle à chaque requête. Supporte 50+ utilisateurs.
# ClearDB Ignite (Heroku free) : 10 connexions max → pool_size=5
# ──────────────────────────────────────────────────────────────
_pool = None

def _get_pool():
    """Initialise (une seule fois) et retourne le pool de connexions."""
    global _pool
    if _pool is None:
        cfg = _parse_db_config()
        # ClearDB Ignite (plan gratuit) supporte max 10 connexions simultanées
        is_cleardb = bool(os.getenv("CLEARDB_DATABASE_URL"))
        pool_size = 5 if is_cleardb else 20
        try:
            _pool = pooling.MySQLConnectionPool(
                pool_name="bodyvision_pool",
                pool_size=pool_size,
                pool_reset_session=True,
                host=cfg["host"],
                port=cfg["port"],
                database=cfg["database"],
                user=cfg["user"],
                password=cfg["password"],
                connection_timeout=10,
                autocommit=False,
            )
            print(f"✅ MySQL connection pool created (pool_size={pool_size})")
        except Error as e:
            print(f"❌ Failed to create connection pool: {e}")
            _pool = None
    return _pool

def get_db():
    """Retourne une connexion depuis le pool (au lieu d'en créer une nouvelle)."""
    pool = _get_pool()
    if pool is None:
        # Fallback : connexion directe si le pool échoue
        try:
            cfg = _parse_db_config()
            connection = mysql.connector.connect(
                host=cfg["host"],
                port=cfg["port"],
                database=cfg["database"],
                user=cfg["user"],
                password=cfg["password"],
                connection_timeout=10,
            )
            return connection
        except Error as e:
            print(f"❌ Fallback connection failed: {e}")
            return None
    try:
        connection = pool.get_connection()
        return connection
    except Error as e:
        print(f"❌ Pool connection failed: {e}")
        return None

def init_db():
    connection = get_db()
    if connection:
        cursor = connection.cursor()
        
        # Table users
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                first_name VARCHAR(100),
                last_name VARCHAR(100),
                age INT,
                weight FLOAT,
                height FLOAT,
                sex VARCHAR(10),
                activity_level VARCHAR(20) DEFAULT 'moderate',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Table analyses
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS analyses (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                image_path VARCHAR(500),
                multi_view_images JSON,
                analysis_data JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        
        # Table fitness_plans (MISE À JOUR avec plan_type)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS fitness_plans (
                id INT AUTO_INCREMENT PRIMARY KEY,
                analysis_id INT,
                plan_data JSON,
                plan_type VARCHAR(20) DEFAULT 'basic',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (analysis_id) REFERENCES analyses(id),
                UNIQUE KEY unique_analysis_plan (analysis_id)
            )
        """)
        
        # Table 3d_models
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS models_3d (
                id INT AUTO_INCREMENT PRIMARY KEY,
                analysis_id INT,
                model_url VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (analysis_id) REFERENCES analyses(id)
            )
        """)
        
        # Table conversation_memory
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS conversation_memory (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                session_id VARCHAR(100) NOT NULL,
                message_type VARCHAR(20) NOT NULL,
                content TEXT,
                is_archived TINYINT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                INDEX idx_user_session (user_id, session_id),
                INDEX idx_created (created_at)
            )
        """)
        
        # Table user_goals
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_goals (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                goal_type VARCHAR(50) DEFAULT 'general',
                description TEXT NOT NULL,
                target_value VARCHAR(100) DEFAULT '',
                current_value VARCHAR(100) DEFAULT '',
                status VARCHAR(20) DEFAULT 'active',
                deadline DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                INDEX idx_user_status (user_id, status)
            )
        """)
        
        # Vérifier et ajouter la colonne plan_type si elle n'existe pas
        try:
            cursor.execute("DESCRIBE fitness_plans")
            columns = [column[0] for column in cursor.fetchall()]
            
            if 'plan_type' not in columns:
                print("⚠️ Adding plan_type column to fitness_plans table...")
                cursor.execute("""
                    ALTER TABLE fitness_plans 
                    ADD COLUMN plan_type VARCHAR(20) DEFAULT 'basic'
                """)
                print("✅ Column plan_type added successfully")
        except Exception as e:
            print(f"⚠️ Error checking/adding plan_type column: {e}")
        
        connection.commit()
        cursor.close()
        connection.close()
        print("✅ Database initialization completed")

def upgrade_database():
    """Fonction pour mettre à jour la base de données sans recréer les tables"""
    connection = get_db()
    if not connection:
        print("❌ Cannot connect to database for upgrade")
        return
    
    cursor = connection.cursor()
    
    try:
        # 1. Vérifier et ajouter la colonne plan_type à fitness_plans
        cursor.execute("""
            SELECT COUNT(*) FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'fitness_plans' 
            AND COLUMN_NAME = 'plan_type'
        """)
        
        if cursor.fetchone()[0] == 0:
            print("🔧 Adding plan_type column to fitness_plans...")
            cursor.execute("""
                ALTER TABLE fitness_plans 
                ADD COLUMN plan_type VARCHAR(20) DEFAULT 'basic'
            """)
            print("✅ plan_type column added")
        else:
            print("✅ plan_type column already exists")

        # 1b. Vérifier et ajouter activity_level à users
        cursor.execute("""
            SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'users'
            AND COLUMN_NAME = 'activity_level'
        """)
        if cursor.fetchone()[0] == 0:
            print("🔧 Adding activity_level column to users...")
            cursor.execute("""
                ALTER TABLE users
                ADD COLUMN activity_level VARCHAR(20) DEFAULT 'moderate'
            """)
            print("✅ activity_level column added")
        else:
            print("✅ activity_level column already exists")
        
        # 2. Vérifier et ajouter la colonne multi_view_images à analyses
        cursor.execute("""
            SELECT COUNT(*) FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'analyses' 
            AND COLUMN_NAME = 'multi_view_images'
        """)
        
        if cursor.fetchone()[0] == 0:
            print("🔧 Adding multi_view_images column to analyses...")
            cursor.execute("""
                ALTER TABLE analyses 
                ADD COLUMN multi_view_images JSON
            """)
            print("✅ multi_view_images column added")
        else:
            print("✅ multi_view_images column already exists")
        
        # 3. Mettre à jour les valeurs plan_type existantes
        print("🔧 Updating existing fitness plans...")
        cursor.execute("""
            UPDATE fitness_plans 
            SET plan_type = 'intelligent' 
            WHERE plan_data LIKE '%intelligent%' OR plan_data LIKE '%phase_1_microcycle%'
        """)
        updated_count = cursor.rowcount
        print(f"✅ Updated {updated_count} fitness plans with intelligent type")
        
        # 4. Migrer la table user_goals vers la nouvelle structure
        cursor.execute("""
            SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'user_goals'
            AND COLUMN_NAME = 'description'
        """)
        if cursor.fetchone()[0] == 0:
            print("🔧 Migrating user_goals table to new schema...")
            # Ajouter les colonnes manquantes
            try:
                cursor.execute("ALTER TABLE user_goals ADD COLUMN description TEXT NOT NULL DEFAULT '' AFTER goal_type")
                print("  ✅ Added 'description' column")
            except Exception:
                pass
            try:
                cursor.execute("ALTER TABLE user_goals ADD COLUMN target_value VARCHAR(100) DEFAULT '' AFTER description")
                print("  ✅ Added 'target_value' column")
            except Exception:
                pass
            try:
                cursor.execute("ALTER TABLE user_goals ADD COLUMN current_value VARCHAR(100) DEFAULT '' AFTER target_value")
                print("  ✅ Added 'current_value' column")
            except Exception:
                pass
            try:
                cursor.execute("ALTER TABLE user_goals ADD COLUMN deadline DATE AFTER status")
                print("  ✅ Added 'deadline' column")
            except Exception:
                pass
            # Migrer les données existantes
            try:
                cursor.execute("UPDATE user_goals SET description = goal_value WHERE description = '' AND goal_value IS NOT NULL")
                cursor.execute("UPDATE user_goals SET current_value = CAST(progress AS CHAR) WHERE current_value = '' AND progress > 0")
                print("  ✅ Migrated existing data")
            except Exception:
                pass
            # Modifier le type de status pour accepter plus de valeurs
            try:
                cursor.execute("ALTER TABLE user_goals MODIFY COLUMN status VARCHAR(20) DEFAULT 'active'")
                print("  ✅ Updated 'status' column type")
            except Exception:
                pass
            print("✅ user_goals migration completed")
        else:
            print("✅ user_goals already has new schema")
        
        connection.commit()
        print("🎉 Database upgrade completed successfully")
        
    except Exception as e:
        print(f"❌ Error during database upgrade: {e}")
        connection.rollback()
    finally:
        cursor.close()
        connection.close()

# Initialiser la base de données au démarrage
if __name__ == "__main__":
    print("🚀 Starting database initialization...")
    init_db()
    upgrade_database()
    print("✨ Database setup complete!")