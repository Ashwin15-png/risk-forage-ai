import os
import sys

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.database import engine, Base
from seed import seed_database

def reset_demo():
    print("Dropping existing tables...")
    Base.metadata.drop_all(bind=engine)
    print("Tables dropped. Rebuilding schema and re-seeding...")
    seed_database()
    print("Demo data reset successfully!")

if __name__ == "__main__":
    reset_demo()
