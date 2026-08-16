"""Durable provenance records for reviewed, offline legal authority packs."""
from datetime import datetime
from typing import Optional
from sqlalchemy import Index, UniqueConstraint
from sqlmodel import Field, SQLModel

from vibe_justice.models.evidence import utc_now

class LegalPack(SQLModel, table=True):
    __tablename__="legal_packs"
    __table_args__=(UniqueConstraint("pack_key","version",name="uq_legal_pack_version"),)
    pack_id:str=Field(primary_key=True,max_length=80)
    pack_key:str=Field(index=True,max_length=80)
    jurisdiction:str=Field(max_length=100)
    matter_type:str=Field(max_length=120)
    version:str=Field(max_length=30)
    as_of:str=Field(max_length=30)
    retrieved_at:datetime
    status:str=Field(default="source_checked",max_length=40)
    approval_status:str=Field(default="not_approved_for_matching",max_length=40)
    snapshot_path:str=Field(max_length=600)
    sha256:str=Field(max_length=64)
    installed_at:datetime=Field(default_factory=utc_now)

class LegalSource(SQLModel, table=True):
    __tablename__="legal_sources"
    __table_args__=(Index("ix_legal_source_pack", "pack_id", "ordinal"),)
    source_id:str=Field(primary_key=True,max_length=100)
    pack_id:str=Field(foreign_key="legal_packs.pack_id",index=True,max_length=80)
    ordinal:int
    title:str=Field(max_length=300)
    canonical_url:str=Field(max_length=600)
    official:bool=True
    status:str=Field(default="source_checked",max_length=40)
    locator:str=Field(max_length=100)
    excerpt:str
    sha256:str=Field(max_length=64)
    retrieved_at:datetime

class LegalRuleElement(SQLModel, table=True):
    __tablename__="legal_rule_elements"
    element_id:str=Field(primary_key=True,max_length=120)
    source_id:str=Field(foreign_key="legal_sources.source_id",index=True,max_length=100)
    pack_id:str=Field(foreign_key="legal_packs.pack_id",index=True,max_length=80)
    ordinal:int
    authority_text:str
    applicability:str=Field(max_length=500)
    status:str=Field(default="source_checked",max_length=40)
