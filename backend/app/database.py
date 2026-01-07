import mysql.connector
from mysql.connector import Error
import os
from dotenv import load_dotenv

load_dotenv()

def get_db():
    try:
        connection = mysql.connector.connect(
            host=os.getenv("DB_HOST", "localhost"),
            database=os.getenv("DB_NAME", "bodyvision_ai"),
            user=os.getenv("DB_USER", "root"),
            password=os.getenv("DB_PASSWORD", "")
        )
        return connection
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
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