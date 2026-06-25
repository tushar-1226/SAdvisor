import os
from sqlalchemy import create_engine, Column, Integer, String, Text
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = "sqlite:///./drug_intelligence.db"

# Create database engine
engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class DrugLabel(Base):
    __tablename__ = "drug_labels"

    id = Column(Integer, primary_key=True, index=True)
    
    # Basic
    drug_name = Column(String, index=True)
    generic_name = Column(String, index=True, nullable=True)
    sponsor = Column(String, nullable=True)
    approval_date = Column(String, nullable=True)
    
    # Core
    indications = Column(Text, nullable=True)
    dosage = Column(Text, nullable=True)
    adverse_reactions = Column(Text, nullable=True)
    efficacy_data = Column(Text, nullable=True)
    
    # Advanced Intelligence
    moa = Column(Text, nullable=True)
    biomarkers = Column(Text, nullable=True)
    line_of_therapy = Column(Text, nullable=True)
    black_box_warnings = Column(Text, nullable=True)
    
    source_file = Column(String, nullable=True)

# Create tables
Base.metadata.create_all(bind=engine)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
