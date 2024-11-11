from kivymd.tools.hotreload.app import MDApp
from kivymd.uix.gridlayout import MDGridLayout
from kivymd.uix.screenmanager import MDScreenManager
from kivymd.uix.transition import MDSlideTransition
from kivymd.uix.navigationbar import MDNavigationBar, MDNavigationItem
from kivy.properties import ObjectProperty, StringProperty, BooleanProperty

import os
import utils
import cam_utils
import uuid
import platform


class NavigationScreen(MDScreenManager):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs, transition=MDSlideTransition(duration=0.15))


class NavigationBar(MDNavigationBar): ...


class BaseMDNavigationItem(MDNavigationItem):
    icon = StringProperty()
    text = StringProperty()


SafeCamera = cam_utils.SafeCamera


def model_detect_image(image):
    """placeholder for model detection, this should return path to
    the image with bounding boxes and labels
    """

    # for now, just return the original image
    return image


class MainApp(MDApp):
    DEBUG = False
    manager = None
    file_path = StringProperty()
    out_file_path = StringProperty()
    safe_camera = ObjectProperty()
    is_camera_open = BooleanProperty(False)
    UUID_dir = "."
    is_camera_open = False

    def check_UUID_dir(self):
        """Create temp directory for generated images if there are any."""
        while os.path.exists(self.UUID_dir):
            self.UUID_dir = "." + uuid.uuid4().hex[:12]
        os.mkdir(self.UUID_dir)
        print(f"Working in {self.UUID_dir}")

    def init_utils(self):
        self.open_cam = cam_utils.open_cam
        self.release_cam = cam_utils.release_cam

        self.title = "Crop Disease Detection"
        self.icon = "assets/icons/robot-outline.512.png"
        self.theme_cls.material_style = "M3"
        self.file_path = "assets/icons/machine-learning.png"
        self.file_path = os.path.abspath(self.file_path)

        self.tabs_title_to_id = utils.tabs_title_to_id
        (setattr(self, id, title) for title, id in self.tabs_title_to_id.items())

        self.tabs_wo_navbar = utils.tabs_wo_navbar
        self.tabs_order = utils.tabs_order
        self.colors = utils.colors
        self.color_hex2rgb_int = utils.color_hex2rgb_int
        self.upload_image = utils.upload_image
        self.color_hex2rgb_int = utils.color_hex2rgb_int
        self.color_hex2rgb_flt = utils.color_hex2rgb_flt

    def detect_image(self, image_path):
        # TODO: model detection should be in a separate thread
        # see here: https://kivy.org/doc/stable/api-kivy.app.html#asynchronous-app
        out_img_path = model_detect_image(image_path)
        self.out_file_path = out_img_path
        self.on_switch_tabs("", "", "", "model_scr")

    def capture_image(self, camera):
        out_file_path = cam_utils.capture_image(camera, self.UUID_dir)
        if out_file_path:
            self.file_path = out_file_path
        self.on_switch_tabs("", "", "", "image_scr")

    def on_switch_tabs(self, _bar, _tab, _tab_icon, next_tab_id, is_title=False):
        # TODO: Implement sliding gestures and connect with this function

        if is_title:
            next_tab_id = self.tabs_title_to_id[next_tab_id]
        cur_tab_id = self.manager.current
        moving_right = self.tabs_order[next_tab_id] < self.tabs_order[cur_tab_id]
        self.manager.transition.direction = "right" if moving_right else "left"
        if cur_tab_id not in self.tabs_wo_navbar:
            self.navBar.ids[cur_tab_id].active = False
        if next_tab_id not in self.tabs_wo_navbar:
            self.navBar.ids[next_tab_id].active = True

        # Only open the camera when needed, and keep it closed otherwise
        # This will make the app lightweight, and less battery usage
        # TODO: opening the camera should be in a separate thread
        if next_tab_id == "cam_scr":
            self.open_cam(self)
        elif cur_tab_id == "cam_scr":
            self.release_cam(self)
        self.manager.current = next_tab_id

    def build_app(self):
        self.init_utils()
        self.manager = NavigationScreen()
        self.navBar = NavigationBar()
        layout = MDGridLayout(cols=1)
        layout.add_widget(self.manager)
        layout.add_widget(self.navBar)
        return layout

    def on_stop(self):
        """On destroy, remove all images generated if any."""
        import shutil

        shutil.rmtree(self.UUID_dir)

    def on_pause(self):
        # Here you can save data if needed
        if self.manager.current == "cam_scr":
            # TODO: close the camera, if we were on the camera screen
            ...
        return True

    def on_resume(self, *args):
        """Updating the color scheme when the application resumes."""
        if self.manager.current == "cam_scr":
            # TODO: re-open the camera, if we are on the camera screen after resume
            ...

    def on_start(self) -> None:
        """
        It is fired at the start of the application and requests the
        necessary permissions.
        """

        if platform == "android":
            from android.permissions import request_permissions, Permission  # pylint: disable=import-error # type: ignore

            request_permissions(
                [Permission.READ_EXTERNAL_STORAGE, Permission.WRITE_EXTERNAL_STORAGE]
            )


if __name__ == "__main__":
    app = MainApp()
    app.check_UUID_dir()
    app.run()
