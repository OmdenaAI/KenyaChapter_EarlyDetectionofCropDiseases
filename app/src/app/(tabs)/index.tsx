import { useEffect, useState } from "react";
import {
	View,
	Image,
	StyleSheet,
	Pressable,
	Text,
	Linking,
} from "react-native";
import Toast from "react-native-root-toast";
import Modal from "react-native-modal";

import { useAppState } from "@react-native-community/hooks";
import { useIsFocused } from "@react-navigation/core";
import { CameraType, CameraView, useCameraPermissions } from "expo-camera";
import { TensorflowModel, useTensorflowModel } from "react-native-fast-tflite";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import { Ionicons } from "@expo/vector-icons";

import ParallaxScrollView from "@/components/ParallaxScrollView";
import ParallaxThemedView from "@/components/ParallaxThemedView";
import ThemedText from "@/components/ThemedText";
import Collapsible from "@/components/Collapsible";
import MODELS from "@/constants/Models";
import { argMax, fetch_labels, get_img_model_input } from "@/components/Model";
import ThemedView from "@/components/ThemedView";
import { useThemeColor } from "@/hooks/useThemeColor";

const CAMERA_WIDTH = 320;
const CAMERA_HEIGHT = 320;

const showToastWithMsg = (msg: string) => {
	Toast.show(msg, {
		visible: true,
		position: Toast.positions.BOTTOM,
		shadow: true,
		animation: true,
		delay: 500,
		hideOnPress: true,
	});
};

// see here: https://stackoverflow.com/a/4068586/12896502
const to_pascal_case = (str: string) =>
	str.replace(/(\w)(\w*)/g, function (g0, g1, g2) {
		return g1.toUpperCase() + g2.toLowerCase();
	});

const showRetryDetectionToast = (retries: number) => {
	let retries_txt = "";
	if (retries < 0 || retries > 2) retries_txt = "invalid retry";
	else retries_txt = ["1st try", "2nd try", "3rd try"][retries];
	showToastWithMsg(`Retry running detection ... ${retries_txt}`);
};

export default function HomeScreen() {
	const [predictionClassLabel, setPredictionClassLabel] = useState("");
	const [predictionSubLabel, setPredictionSubLabel] = useState("");

	// TODO: refactor these four duplicate blocks into a hook to be modular with any TensorflowModel

	const all_model = useTensorflowModel(MODELS.all.model);
	const all_actual_model =
		all_model?.state === "loaded" ? all_model?.model : undefined;
	const [all_labels_map, setAll_labels_map] = useState<string[] | undefined>(
		undefined
	);
	if (!all_labels_map)
		fetch_labels(MODELS.all.labels)
			.then((data: string) => setAll_labels_map(data.split("\n")))
			.catch((e) => console.log("[MyErrLog-labelsMap] " + e));

	const beans_model = useTensorflowModel(MODELS.beans.model);
	const beans_actual_model =
		beans_model?.state === "loaded" ? beans_model?.model : undefined;
	const [beans_labels_map, setBeans_labels_map] = useState<
		string[] | undefined
	>(undefined);
	if (!beans_labels_map)
		fetch_labels(MODELS.beans.labels)
			.then((data: string) => setBeans_labels_map(data.split("\n")))
			.catch((e) => console.log("[MyErrLog-labelsMap] " + e));

	const maize_model = useTensorflowModel(MODELS.maize.model);
	const maize_actual_model =
		maize_model?.state === "loaded" ? maize_model?.model : undefined;
	const [maize_labels_map, setMaize_labels_map] = useState<
		string[] | undefined
	>(undefined);
	if (!maize_labels_map)
		fetch_labels(MODELS.maize.labels)
			.then((data: string) => setMaize_labels_map(data.split("\n")))
			.catch((e) => console.log("[MyErrLog-labelsMap] " + e));

	const tomato_model = useTensorflowModel(MODELS.tomato.model);
	const tomato_actual_model =
		tomato_model?.state === "loaded" ? tomato_model?.model : undefined;
	const [tomato_labels_map, setTomato_labels_map] = useState<
		string[] | undefined
	>(undefined);
	if (!tomato_labels_map)
		fetch_labels(MODELS.tomato.labels)
			.then((data: string) => setTomato_labels_map(data.split("\n")))
			.catch((e) => console.log("[MyErrLog-labelsMap] " + e));

	const models_router: {
		[k: string]: { model?: TensorflowModel; labels_map?: string[] };
	} = {
		beans: { model: beans_actual_model, labels_map: beans_labels_map },
		maize: { model: maize_actual_model, labels_map: maize_labels_map },
		tomato: { model: tomato_actual_model, labels_map: tomato_labels_map },
	};

	const [detectionsToastShow, setDetectionsToastShow] = useState(false);
	let detectionsToast = (
		<Toast
			visible={detectionsToastShow}
			position={Toast.positions.BOTTOM}
			shadow={true}
			animation={true}
			hideOnPress={true}
		>
			Running Detection ...
		</Toast>
	);

	const isFocused = useIsFocused();
	const appState = useAppState();
	const [useCamera, setUseCamera] = useState(false);
	const [cameraPermission, requestCameraPermission] = useCameraPermissions();
	const [showAppSettingsModal, setShowAppSettingsModal] =
		useState<boolean>(false);
	const [camera, setCamera] = useState<CameraView | null>(null);
	const [cameraReady, setCameraReady] = useState(false);
	const [facing, setFacing] = useState<CameraType>("back");
	const cameraOpened =
		useCamera &&
		cameraPermission?.granted &&
		isFocused &&
		appState === "active";

	useEffect(() => {
		if (appState !== "active") return;
		setShowAppSettingsModal(false);
	}, [appState]);

	const getCameraPermissions = () => {
		if (!cameraPermission) {
			showToastWithMsg("Camera is still loading, please try again");
			return;
		}

		requestCameraPermission();

		if (!cameraPermission.granted && !cameraPermission.canAskAgain)
			setShowAppSettingsModal(true);
		return cameraPermission.granted;
	};

	const toggleCamera = (useCamera: boolean = false) => {
		setUseCamera(useCamera);
		if (useCamera && !cameraPermission?.granted) getCameraPermissions();
	};

	useEffect(() => {
		toggleCamera(cameraOpened);
		setShowAppSettingsModal(useCamera && !cameraPermission?.granted);
	}, [cameraPermission]);

	const [updatedImageUri, setUpdatedImageUri] = useState<any>(null);
	const openImagePicker = () =>
		ImagePicker.launchImageLibraryAsync({ quality: 1, legacy: true }).then(
			setUpdatedImageUri
		);
	const [prevImageUri, setPrevImageUri] = useState<any>(null);
	const [imageUri, setImageUri] = useState<any>(null);
	const [imageContent, setImageContent] = useState<any>(null);
	const [imgInput, setImgInput] = useState<any>(null);
	const [enableDetection, setEnableDetection] = useState(false);

	useEffect(() => {
		let skip = false;
		let newImageUri = null;
		if (updatedImageUri?.assets)
			// source is image picker
			newImageUri = { localUri: true, uri: updatedImageUri?.assets[0].uri };
		else if (updatedImageUri?.path)
			// source is camera
			newImageUri = { camUri: true, uri: updatedImageUri.path };
		else if (updatedImageUri?.uri && !updatedImageUri?.camUri) {
			// use latest uploaded image after discarding cam capture
			newImageUri = { localUri: true, uri: updatedImageUri.uri };
			setImageUri(newImageUri);
		} else if (imageUri?.uri && !imageUri?.camUri) {
			// if all sources fail, check if current image is a valid then leave it as is
			newImageUri = imageUri;
			skip = true;
		} else {
			// otherwise, load default image
			newImageUri = require("@/assets/images/robot-outline.512.png");
			setImgInput(null);
		}

		if (skip) {
			console.log(`[MyInfoLog-updatePreview] there's no new image to be set`);
			return;
		}

		const img_size = { width: CAMERA_WIDTH, height: CAMERA_HEIGHT };
		const float_input_model =
			all_actual_model?.inputs[0].dataType === "float32";
		if (newImageUri?.uri)
			get_img_model_input(newImageUri.uri, img_size, float_input_model)
				.then((img) => {
					if (!img)
						throw new Error(
							"[MyErrLog-modelInput] There's no image input for the model"
						);
					setImgInput(img);
				})
				.catch((e) => console.log(`[MyErrLog-modelInput] ${e}`));

		setImageContent(
			<Image
				source={newImageUri}
				style={{ width: CAMERA_WIDTH, height: CAMERA_HEIGHT }}
			/>
		);

		setDetectionsToastShow(false);
		setPredictionClassLabel("");
		setPredictionSubLabel("");
		if (!imageUri?.camUri) setPrevImageUri(imageUri);
		setImageUri(newImageUri);
	}, [updatedImageUri]);

	const runDetection = () => {
		const detect = (model: TensorflowModel, labels_map: string[]) => {
			if (!labels_map || !model || !imgInput) return;

			const model_results = all_actual_model?.runSync([imgInput]);
			if (!model_results)
				return console.log("[MyErrLog-inference] No inference results");

			const classIdx = argMax(model_results[0] as Float32Array);
			return labels_map[classIdx].trim();
		};

		let retries = 0;
		const tryDetection = (model: TensorflowModel, labels_map: string[]) => {
			++retries;
			let detectionResult = detect(model, labels_map);

			if (!detectionResult) {
				if (retries < 3) {
					console.log(
						`[MyWarnLog-detection] Detection failed, Retry #${retries}`
					);
					showRetryDetectionToast(retries - 1);
					setTimeout(tryDetection, 1000);
				} else {
					setPredictionClassLabel("Detection failed!");
				}
			} else {
				setTimeout(setDetectionsToastShow, 300, false);
				setTimeout(setDetectionsToastShow, 600, false);
				if (detectionResult in models_router) {
					setPredictionClassLabel(
						to_pascal_case(detectionResult.toLowerCase())
					);
					setTimeout(
						tryDetection,
						1,
						models_router[detectionResult].model,
						models_router[detectionResult].labels_map
					);
				} else {
					setPredictionSubLabel(
						to_pascal_case(detectionResult.toLowerCase().replaceAll("_", " "))
					);
				}
			}
		};

		setDetectionsToastShow(true);
		// TODO: figure out how to move this function calling to another thread
		setTimeout(tryDetection, 1, all_model, all_labels_map);
	};

	useEffect(() => {
		setEnableDetection(all_labels_map && all_actual_model && imgInput);
	}, [all_actual_model, all_labels_map, imgInput]);

	const previewCameraCapture = async () => {
		camera
			?.takePictureAsync({
				scale: 1,
				quality: 0.6,
				skipProcessing: true,
			})
			.then((img) => {
				const camShot = { ...img, path: img?.uri };
				delete camShot?.uri;
				setUpdatedImageUri(camShot);
				setUseCamera(false);
				return img;
			})
			.catch((e) => {
				console.log(`[MyErrLog-previewCamera] ${e}`);
			});
	};

	const captureCameraBtn = (
		<Pressable
			style={[styles.camCaptureImageBtn]}
			onPress={previewCameraCapture}
		>
			<Text>
				<Ionicons size={30} name="camera-outline" />
			</Text>
			<Text
				style={{
					fontSize: 25,
					color: "#000",
					letterSpacing: 2,
					marginLeft: 5,
				}}
			>
				Capture
			</Text>
		</Pressable>
	);

	let cameraContent = <View></View>;
	if (cameraOpened)
		cameraContent = (
			<CameraView
				style={{ flex: 1 }}
				facing={facing}
				ref={setCamera}
				onCameraReady={() => setCameraReady(true)}
				onMountError={(e) =>
					console.log(`[MyErrLog-camerMount] ${JSON.stringify(e)}\n${e}`)
				}
				// capture a picture with good resolution then downsample to model input size 312x312
				pictureSize="720x720"
			>
				{cameraReady ? captureCameraBtn : <View></View>}
			</CameraView>
		);

	const openAppSettingsScreen = (
		<Modal
			isVisible={showAppSettingsModal}
			style={{ width: 350, alignSelf: "center" }}
			onBackdropPress={() => setShowAppSettingsModal(false)}
		>
			<ThemedView style={[styles.centeredView, { zIndex: 9 }]}>
				<ThemedView
					style={[styles.modalView, { shadowColor: useThemeColor({}, "tint") }]}
				>
					<ThemedText
						style={[styles.modalText, { fontSize: 17, fontWeight: "bold" }]}
					>
						Camera Permissions
					</ThemedText>
					<ThemedText style={styles.modalText}>
						The App can't have access to your camera.
					</ThemedText>
					<ThemedText style={styles.modalText}>
						You can give access to camera from app settings, click "I accept" to
						go to the app settings page.
					</ThemedText>
					<Pressable onPress={Linking.openSettings}>
						<ThemedText
							style={[
								styles.textStyle,
								{ backgroundColor: useThemeColor({}, "btnBackground") },
							]}
						>
							I accept
						</ThemedText>
					</Pressable>
				</ThemedView>
			</ThemedView>
		</Modal>
	);

	const uploadImageBtn = (
		<Pressable style={styles.imageButtons} onPress={openImagePicker}>
			<ThemedText style={styles.imageButtonsText}>Upload Image</ThemedText>
		</Pressable>
	);
	const toggleCameraBtn = (
		<Pressable
			style={styles.imageButtons}
			onPress={() => {
				toggleCamera(!useCamera);
				if (cameraOpened) return;
				let imgUri = imageUri;
				if (imgUri?.camUri) delete imgUri.camUri;
				setUpdatedImageUri({ ...imgUri });
			}}
		>
			<ThemedText style={styles.imageButtonsText}>
				{cameraOpened && cameraReady ? "Close" : "Open"} Camera
			</ThemedText>
		</Pressable>
	);

	const saveCaptureBtn = (
		<Pressable
			style={styles.imageButtons}
			onPress={async () => {
				MediaLibrary.createAssetAsync(imageUri?.uri)
					.then((data) => {
						showToastWithMsg("Image saved to gallery!");
						setTimeout(setUpdatedImageUri, 1, data);
					})
					.catch((e) => {
						console.log(`[MyErrLog-saveCapture] ${JSON.stringify(e)}\n${e}`);
					});
			}}
		>
			<ThemedText style={styles.imageButtonsText}>Save to gallery</ThemedText>
		</Pressable>
	);
	const discardCaptureBtn = (
		<Pressable
			style={styles.imageButtons}
			onPress={() => {
				let imgUri = prevImageUri;
				if (imgUri?.camUri) delete imgUri.camUri;
				setUpdatedImageUri({ ...imgUri });
			}}
		>
			<ThemedText style={styles.imageButtonsText}>Discard</ThemedText>
		</Pressable>
	);

	const detectionBtn = (
		<View
			style={{
				flexDirection: "row",
				justifyContent: "center",
				marginVertical: 20,
			}}
		>
			<Pressable
				style={styles.imageButtons}
				onPress={runDetection}
				disabled={!enableDetection || cameraOpened}
			>
				<ThemedText style={styles.imageButtonsText}>Check Crop</ThemedText>
			</Pressable>
		</View>
	);

	const detectionOutputs = (
		// TODO: Buttons && Detections sections have in-consistent dark theme colors with app UI
		<ParallaxThemedView childrenStyle={styles.content}>
			<ThemedText type="title">Results</ThemedText>
			<ParallaxScrollView childrenStyle={styles.innerContent}>
				<View style={{ alignSelf: "center" }}>
					<ThemedText
						style={[
							styles.detectionLabelText,
							{ backgroundColor: useThemeColor({}, "background") },
						]}
					>
						{predictionClassLabel !== "" ? "Crop:" : ""} {predictionClassLabel}
					</ThemedText>
					<ThemedText
						style={[
							styles.subLabelText,
							{ backgroundColor: useThemeColor({}, "background") },
						]}
					>
						{predictionSubLabel !== "" ? "Type:" : ""} {predictionSubLabel}
					</ThemedText>
				</View>
				<Collapsible title="Crop disease prediction details" defaultOpen={true}>
					<ThemedText>Here goes a list of details if there're any.</ThemedText>
				</Collapsible>
			</ParallaxScrollView>
		</ParallaxThemedView>
	);

	const themedBackgroundStyle = {
		backgroundColor: useThemeColor({}, "background"),
	};

	return (
		<View style={[styles.pageContainer, themedBackgroundStyle]}>
			<View style={{ alignItems: "center", justifyContent: "flex-start" }}>
				<ThemedText style={{ letterSpacing: 2 }} type="title"></ThemedText>
				<View style={styles.imageContainer}>
					{cameraOpened ? cameraContent : imageContent}
				</View>

				{cameraOpened && cameraReady ? (
					<View style={styles.imageButtonsContainer}>{toggleCameraBtn}</View>
				) : (
					<View style={styles.imageButtonsContainer}>
						{imageUri?.camUri ? discardCaptureBtn : uploadImageBtn}
						{imageUri?.camUri ? saveCaptureBtn : toggleCameraBtn}
					</View>
				)}
			</View>
			{detectionsToast}
			{detectionOutputs}
			{enableDetection && !cameraOpened ? detectionBtn : <View></View>}
			{openAppSettingsScreen}
		</View>
	);
}

const styles = StyleSheet.create({
	headerImage: {
		color: "#808080",
		bottom: -90,
		left: -35,
		position: "absolute",
	},
	container: {
		flex: 1,
	},
	header: {
		height: 200,
		overflow: "hidden",
	},
	content: {
		flex: 1,
		paddingTop: 30,
		paddingHorizontal: 25,
		gap: 16,
		overflow: "hidden",
	},
	innerContent: {
		flex: 1,
		paddingHorizontal: 10,
	},
	pageContainer: {
		flexDirection: "column",
		flex: 1,
	},
	stepContainer: {
		gap: 8,
		marginBottom: 8,
	},
	reactLogo: {
		height: 178,
		width: 290,
		bottom: 0,
		left: 0,
		position: "absolute",
	},
	imageContainer: {
		width: CAMERA_WIDTH,
		height: CAMERA_HEIGHT,
		minWidth: CAMERA_WIDTH,
		minHeight: CAMERA_HEIGHT,
	},
	imageButtons: {
		borderColor: "#59c",
		borderStyle: "solid",
		borderWidth: 3,
		borderRadius: 10,
		paddingVertical: 5,
		marginHorizontal: 5,
		marginVertical: 10,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#7be",
		width: 130,
		height: 40,
	},
	imageButtonsText: {
		fontWeight: "500",
		fontSize: 17,
	},
	imageButtonsContainer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
	},
	detectionLabelText: {
		letterSpacing: 2,
		fontSize: 25,
		fontWeight: "700",
		paddingTop: 5,
		paddingBottom: 10,
		alignSelf: "center",
		width: "100%",
		gap: 5,
	},
	subLabelText: {
		letterSpacing: 2,
		fontSize: 25,
		fontWeight: "700",
		paddingTop: 10,
		paddingBottom: 20,
		alignSelf: "center",
		justifyContent: "center",
		width: "100%",
		gap: 15,
	},
	camCaptureImageBtn: {
		opacity: 0.6,
		backgroundColor: "#7be",
		width: "100%",
		height: 50,
		marginTop: "auto",
		justifyContent: "center",
		alignItems: "center",
		flexDirection: "row",
	},
	centeredView: {
		height: 0,
		justifyContent: "center",
		alignItems: "center",
	},
	modalView: {
		padding: 20,
		height: 265,
		borderRadius: 20,
		alignItems: "center",
		elevation: 5,
	},
	modalText: {
		marginBottom: 15,
		textAlign: "center",
	},
	textStyle: {
		fontWeight: "bold",
		textAlign: "center",
		paddingVertical: 5,
		paddingHorizontal: 10,
		borderRadius: 5,
	},
});
