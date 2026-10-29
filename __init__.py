from .api import setup_routes
from .image_monitor import setup_monitor_routes
from .input_manager import setup_input_routes
from .model_manager import setup_model_routes
from .nodes import NODE_CLASS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS
from .outfit_builder import setup_outfit_routes
from .pose_builder import setup_pose_routes
from .environment_builder import setup_environment_routes
from .lighting_builder import setup_lighting_routes

WEB_DIRECTORY = "./web"

setup_routes()
setup_model_routes()
setup_input_routes()
setup_monitor_routes()
setup_outfit_routes()
setup_pose_routes()
setup_environment_routes()
setup_lighting_routes()

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
