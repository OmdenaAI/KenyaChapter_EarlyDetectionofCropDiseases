import os
import sys

from PIL import Image
from kivymd.app import MDApp
from kivymd.uix.filemanager import MDFileManager

class DotDict(dict):
    """dot.notation access to dictionary attributes"""

    __getattr__ = dict.get
    __setattr__ = dict.__setitem__
    __delattr__ = dict.__delitem__


colors = DotDict(
    {
        "md_bg_color": "#CCCCCC",
        "background_neutral_default": "#5A5A5A",
        "font_surface_variant": "#E7E0EC",
    }
)

tabs_title_to_id = {
    "Image Upload": "image_scr",
    "Capture Camera": "cam_scr",
    "Model Inference": "model_scr",
    "User Profile": "user_scr",
}
tabs_order = {
    "image_scr": 0,
    "cam_scr": 1,
    "model_scr": 2,
    "user_scr": 3,
}
tabs_wo_navbar = ("cam_scr",)


def load_kv(module_name):
    MDApp.get_running_app().KV_FILES.append(
        f"{os.path.join(*module_name.split('.'))}.kv"
    )


def color_hex2rgb_int(hex_color):
    return tuple(int(hex_color[i : i + 2], 16) for i in (1, 3, 5))


def color_hex2rgb_flt(hex_color):
    return tuple(c / 255 for c in color_hex2rgb_int(hex_color))


def file_manager_open(self):
    open_file_dir = os.path.dirname(self.file_path)
    file_manager = None

    def exit_manager(*args):
        self.manager_open = False
        file_manager.close()

    def select_path(img_path):
        try:
            Image.open(img_path)
            exit_manager()
            self.file_path = img_path
        except Exception as image_exception:
            print(
                f'[Error] Some error happened while reading selected image  "{img_path}".',
                "Please check again image path. See below for error details.",
                f"{image_exception = }",
                sep="\n",
                file=sys.stderr,
            )

    file_manager = MDFileManager(
        exit_manager=exit_manager,
        select_path=select_path,
        selector="file",
        ext=[".jpg", ".jpeg", ".png", ".webp"],
    )
    file_manager.show(open_file_dir)


def upload_image(self):
    # placeholder for uploading an image
    file_manager_open(self)
