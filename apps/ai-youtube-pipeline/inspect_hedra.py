import inspect
from hedra import Hedra

print(inspect.signature(Hedra(api_key="test").characters.create))
