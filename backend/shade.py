# /app/backend/shade.py

import base64
import json
from typing import Tuple, Dict

def create_buy_scrt_msg_data(usdc_amount: str, owner: str) -> Tuple[str, str, Dict]:
    """
    Prepares the data needed to construct the buy sSCRT message.
    Returns a tuple of: (contract_address, code_hash, message_dict)
    """
    s_usdc_address = "secret1vkq022x4q8t8kx9de3r84u669l65xnwf2lg3e6"
    s_usdc_code_hash = "638a3e1d50175fbcb8373cf801565283e3eb23d88a9b7b7f99fcc5eb1e6b561e"
    shade_router_address = "secret1pjhdug87nxzv0esxasmeyfsucaj98pw4334wyc"

    swap_msg = {
        "swap_tokens_for_exact": {
            "expected_return": "1",
            "path": [
                {"addr": "secret1qz57pea4k3ndmjpyn6tdjcuq4tzrvjn0aphca0k", "code_hash": "e88165353d5d7e7847f2c84134c3f7871b2eee684ffac9fcf8d99a4da39dc2f2"},
                {"addr": "secret1a6efnz9y702pctmnzejzkjdyq0m62jypwsfk92", "code_hash": "e88165353d5d7e7847f2c84134c3f7871b2eee684ffac9fcf8d99a4da39dc2f2"},
                {"addr": "secret1y6w45fwg9l9pxd6qys8ltjlnu9xa4f2de7sp", "code_hash": "e88165353d5d7e7847f2c84134c3f7871b2eee684ffac9fcf8d99a4da39dc2f2"}
            ]
        }
    }
    swap_msg_base64 = "eyJzd2FwX3Rva2Vuc19mb3JfZXhhY3QiOnsiZXhwZWN0ZWRfcmV0dXJuIjoiMSIsInBhdGgiOlt7ImFkZHIiOiJzZWNyZXQxcXo1N3BlYTRrM25kbWpweTZ0ZGpjdXE0dHpydmpuMGFwaGNhMGsiLCJjb2RlX2hhc2giOiJlODgxNjUzNTNkNWQ3ZTc4NDdmMmM4NDEzNGMzZjc4NzFiMmVlZTY4NGZmYWM5ZmNmOGQ5OWE0ZGEzOWRjMmYyIn0seyJhZGRyIjoic2VjcmV0MWE2ZWZuejl5NzAycGN0bW56ZWp6a2pkeXEwbTYyanlwd3NmazkyIiwiY29kZV9oYXNoIjoiZTg4MTY1MzUzZDVkN2U3ODQ3ZjJjODQxMzRjM2Y3ODcxYjJlZWU2ODRmZmFjOWZjZjhkOTlhNGRhMzlkYzJmMiJ9LHsiYWRkciI6InNlY3JldDF5Nnc0NWZ3ZzlsbjlweGQ2cXlzOGx0amxudHU5eGE0ZjJkZTdzcCIsImNvZGVfaGFzaCI6ImU4ODE2NTM1M2Q1ZDdlNzg0N2YyYzg0MTM0YzNmNzg3MWIyZWVlNjg0ZmZhYzlmY2Y4ZDk5YTRkYTM5ZGMyZjIifV19fQ=="

    msg_dict = {
        "send": {
            "owner": owner,
            "recipient": shade_router_address,
            "amount": usdc_amount,
            "msg": swap_msg_base64,
            "padding": "Iq7w0EzEpkt",
        }
    }

    return (s_usdc_address, s_usdc_code_hash, msg_dict)