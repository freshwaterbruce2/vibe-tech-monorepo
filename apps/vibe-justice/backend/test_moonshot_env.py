import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv('MOONSHOT_API_KEY')
print(f'API KEY loaded: {api_key[:5]}...' if api_key else 'NO API KEY')
