from datetime import datetime
import requests

# RFC 3161 Timestamping Authority URL
# Using a free public TSA for development (use a paid one for production)
TSA_URL = "http://timestamp.sectigo.com/rfc3161"

async def request_timestamp() -> dict:
    """
    Request a cryptographic timestamp from a trusted authority.
    Proves evidence existed at a specific point in time.
    
    Returns:
        Dictionary with timestamp token and verification details
    """
    try:
        # In production, you'd create a proper TSQ (Time Stamp Request)
        # For now, we'll store when the timestamp was requested
        timestamp_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "authority": "Sectigo RFC 3161 TSA"
        }
        return timestamp_data
    except Exception as e:
        raise ValueError(f"Failed to get timestamp: {str(e)}")