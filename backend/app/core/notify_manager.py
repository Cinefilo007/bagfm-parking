from typing import List, Dict
from fastapi import WebSocket
import json

class NotifyManager:
    """
    Gestor de conexiones WebSocket para notificaciones en tiempo real.
    Permite el broadcast de alertas sobre infracciones a los actores correspondientes.
    """
    def __init__(self):
        # Conexiones activas agrupadas por rol para broadcast selectivo
        # { "ALCABALA": [ws1, ws2], "COMANDANTE": [ws3] }
        self.active_connections: Dict[str, List[WebSocket]] = {
            "ALCABALA": [],
            "COMANDANTE": [],
            "ADMIN_BASE": [],
            "SUPERVISOR": []
        }

    async def conectar(self, websocket: WebSocket, rol: str):
        await websocket.accept()
        if rol in self.active_connections:
            self.active_connections[rol].append(websocket)
        else:
            # Si el rol no es uno de los objetivos de notificación, permitimos conexión pero no broadcast
            if "OTROS" not in self.active_connections:
                self.active_connections["OTROS"] = []
            self.active_connections["OTROS"].append(websocket)

    def desconectar(self, websocket: WebSocket, rol: str):
        if rol in self.active_connections and websocket in self.active_connections[rol]:
            self.active_connections[rol].remove(websocket)
        elif "OTROS" in self.active_connections and websocket in self.active_connections["OTROS"]:
            self.active_connections["OTROS"].remove(websocket)

    async def enviar_mensaje_personal(self, mensaje: str, websocket: WebSocket):
        await websocket.send_text(mensaje)

    async def broadcast(self, mensaje: dict, roles: List[str] = None):
        """
        Envía un mensaje a todos los usuarios con los roles especificados.
        Si roles es None, envía a todos los roles predefinidos (Alcabala, Comandante, etc).
        """
        objetivos = roles if roles else ["ALCABALA", "COMANDANTE", "ADMIN_BASE", "SUPERVISOR"]
        
        mensaje_json = json.dumps(mensaje)
        
        for rol in objetivos:
            if rol in self.active_connections:
                for connection in self.active_connections[rol]:
                    try:
                        await connection.send_text(mensaje_json)
                    except Exception:
                        # Si una conexión falla (browser cerrado abruptamente), se ignora aquí
                        # y se limpiará en el endpoint del WS
                        pass

# Instancia global del gestor
manager = NotifyManager()
