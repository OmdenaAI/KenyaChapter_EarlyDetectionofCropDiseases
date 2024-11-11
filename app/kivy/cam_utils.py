import cv2
import time
from kivy.uix.camera import Camera
from kivymd.uix.boxlayout import MDBoxLayout


def capture_image(camera, run_uuid_dir):
    """
    Function to capture the images and give them the names
    according to their captured time and date.
    """
    if not camera:
        return None
    captured_image_path = rf"{run_uuid_dir}/IMG_{time.strftime('%Y%m%d_%H%M%S')}.png"
    camera.export_to_png(captured_image_path)
    return captured_image_path


class AutoCamera(Camera): ...


class SafeCamera(MDBoxLayout):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.camera: AutoCamera = None

    def check_valid_camera_device(self):
        return self.camera or cv2.VideoCapture(0, cv2.CAP_DSHOW).isOpened()

    def _init_camera(self):
        print(f'{self = }', f'{self.children = }')
        if len(self.children):
            self.remove_widget(self.children[0])
        self.camera = AutoCamera()
        self.add_widget(self.camera)


def check_camera_initialized(safe_camera):
    camera = safe_camera.camera
    print(f"{safe_camera = }", f"{camera = }, {safe_camera.check_valid_camera_device()}")
    if safe_camera and not camera and safe_camera.check_valid_camera_device():
        try:
            safe_camera._init_camera()
            return True
        except Exception as e:
            print(e)
    if safe_camera and camera:
        return True


def release_cam(self):
    safe_camera = self.manager.ids.cam_scr.ids.safe_camera
    if not check_camera_initialized(safe_camera):
        return

    try:
        self.is_camera_open = safe_camera.camera._camera._device.isOpened()
        if self.is_camera_open:
            safe_camera.camera.play = False
            safe_camera.camera._camera._device.release()
            safe_camera.camera = None
            self.is_camera_open = False
    except Exception as e:
        print(e)


def open_cam(self):
    safe_camera = self.manager.ids.cam_scr.ids.safe_camera
    if not check_camera_initialized(safe_camera):
        return

    try:
        self.is_camera_open = safe_camera.camera._camera._device.isOpened()
        if not self.is_camera_open:
            safe_camera.camera._camera._device.open(0)
            self.is_camera_open = True
        safe_camera.camera.play = self.is_camera_open

    except Exception as e:
        print(e)


def toggle(self, safe_camera):
    if not safe_camera.check_valid_camera_device():
        return False

    if self.is_camera_open:
        release_cam(self)
    else:
        open_cam(self)
