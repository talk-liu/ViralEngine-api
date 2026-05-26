from pydantic import BaseModel, Field


class MediaJobPayload(BaseModel):
    jobId: str
    userId: str
    type: str
    inputKey: str = ""
    outputKey: str
    params: dict = Field(default_factory=dict)
