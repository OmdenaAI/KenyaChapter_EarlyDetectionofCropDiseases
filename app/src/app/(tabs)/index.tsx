import { useEffect, useState } from "react";
import {
	View,
	Image,
	StyleSheet,
	Pressable,
	Text,
	Linking,
	useColorScheme,
} from "react-native";
import Toast from "react-native-root-toast";
import Modal from "react-native-modal";

import { useAppState } from "@react-native-community/hooks";
import { useIsFocused } from "@react-navigation/core";
import { TensorflowModel, useTensorflowModel } from "react-native-fast-tflite";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import Feather from "@expo/vector-icons/Feather";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import { CameraType, CameraView, useCameraPermissions } from "expo-camera";

import ParallaxScrollView from "@/components/ParallaxScrollView";
import ParallaxThemedView from "@/components/ParallaxThemedView";
import ThemedText from "@/components/ThemedText";
import Collapsible from "@/components/Collapsible";
import MODELS from "@/constants/Models";
import { argMax, fetch_labels, get_img_model_input } from "@/components/Model";
import ThemedView from "@/components/ThemedView";
import { useThemeColor } from "@/hooks/useThemeColor";
import Colors from "@/constants/Colors";

const CAMERA_WIDTH = 320;
const CAMERA_HEIGHT = 320;
type TFLite_model = { model?: TensorflowModel; labels_map?: string[] };

const showToastWithMsg = (msg: string, delay: number = 500) => {
	Toast.show(msg, {
		visible: true,
		position: Toast.positions.BOTTOM,
		shadow: true,
		animation: true,
		delay: delay,
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
	else retries_txt = ["1st", "2nd", "3rd"][retries] + " try";
	showToastWithMsg(`Retry running detection ... ${retries_txt}`, 500);
};

export default function HomeScreen() {
	const [predictionClassLabel, setPredictionClassLabel] = useState("");
	const [predictionSubLabel, setPredictionSubLabel] = useState("");

	// TODO: refactor these four duplicate blocks into a hook to be modular with any TensorflowModel

	const auto_model = useTensorflowModel(MODELS.auto.model);
	const auto_actual_model =
		auto_model?.state === "loaded" ? auto_model?.model : undefined;
	const [auto_labels_map, setAuto_labels_map] = useState<string[] | undefined>(
		undefined
	);
	if (!auto_labels_map)
		fetch_labels(MODELS.auto.labels)
			.then((data: string) => setAuto_labels_map(data.split("\n")))
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

	const cassava_model = useTensorflowModel(MODELS.cassava.model);
	const cassava_actual_model =
		cassava_model?.state === "loaded" ? cassava_model?.model : undefined;
	const [cassava_labels_map, setCassava_labels_map] = useState<
		string[] | undefined
	>(undefined);
	if (!cassava_labels_map)
		fetch_labels(MODELS.cassava.labels)
			.then((data: string) => setCassava_labels_map(data.split("\n")))
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
		[k: string]: TFLite_model;
	} = {
		auto: { model: auto_actual_model, labels_map: auto_labels_map },
		beans: { model: beans_actual_model, labels_map: beans_labels_map },
		cassava: { model: cassava_actual_model, labels_map: cassava_labels_map },
		maize: { model: maize_actual_model, labels_map: maize_labels_map },
		tomato: { model: tomato_actual_model, labels_map: tomato_labels_map },
	};

	const [showModalDetectionModels, setShowModalDetectionModels] =
		useState<boolean>(false);

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
			showToastWithMsg("Camera is still loading, please try again", 500);
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
	const current_style = useColorScheme() ?? "light";

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
			newImageUri = imageUri;
			// if all sources fail, check if current image is a valid then leave it as is
			skip = true;
		} else {
			// otherwise, load default image
			const default_img_uri_dark = "@/assets/images/robot.512-dark.png";
			const default_img_uri = "@/assets/images/robot.512.png";
			newImageUri =
				current_style === "dark"
					? require(default_img_uri_dark)
					: require(default_img_uri);
			setImgInput(null);
		}

		if (skip) {
			console.log(`[MyInfoLog-updatePreview] there's no new image to be set`);
			return;
		}

		const img_size = { width: CAMERA_WIDTH, height: CAMERA_HEIGHT };
		const float_input_model =
			auto_actual_model?.inputs[0].dataType === "float32";
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

	const detect = (model_name: string) => {
		const model: TFLite_model = models_router[model_name] ?? {};
		if (!model.labels_map || !model.model || !imgInput) return;

		const model_results = auto_actual_model?.runSync([imgInput]);
		if (!model_results)
			return console.log("[MyErrLog-inference] No inference results");

		const classIdx = argMax(model_results[0] as Float32Array);
		return model.labels_map[classIdx].trim();
	};

	const tryDetection = (model_name: string, retries: number = 1) => {
		if (retries == 0) setDetectionsToastShow(true);
		let detectionResult = detect(model_name);

		if (!detectionResult) {
			if (retries > 3) {
				if (model_name === "auto")
					return setPredictionClassLabel("Crop Detection failed!");
				return setPredictionSubLabel("Disease Detection failed!");
			}
			console.log(`[MyWarnLog-detection] Detection failed, Retry #${retries}`);
			showRetryDetectionToast(retries - 1);
			setTimeout(tryDetection, 1000, model_name, retries + 1);
		} else {
			setTimeout(setDetectionsToastShow, 300, false);
			setTimeout(setDetectionsToastShow, 1000, false);
			setTimeout(setDetectionsToastShow, 3000, false);
			if (detectionResult in models_router) {
				setPredictionClassLabel(to_pascal_case(detectionResult.toLowerCase()));
				setTimeout(tryDetection, 1, detectionResult);
			} else {
				setPredictionSubLabel(
					to_pascal_case(detectionResult.toLowerCase().replaceAll("_", " "))
				);
			}
		}
	};

	useEffect(() => {
		setEnableDetection(auto_labels_map && auto_actual_model && imgInput);
	}, [auto_actual_model, auto_labels_map, imgInput]);

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

	const themedTintClr = useThemeColor({}, "tint");
	const themedBtnBackgroundClr = useThemeColor({}, "btnBackground");
	const themedBackgroundClr = useThemeColor({}, "background");
	const themedTextClr = useThemeColor({}, "text");

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
				// capture a picture with good resolution then downsample to model input size 320x320
				pictureSize="720x720"
			></CameraView>
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
								{ backgroundColor: themedBtnBackgroundClr },
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
		<Pressable
			style={[styles.imageButtons, { flexDirection: "row" }]}
			onPress={openImagePicker}
		>
			<Text style={{ lineHeight: 30, marginRight: 5 }}>
				<Feather name="upload" size={24} color="black" />
			</Text>
			<ThemedText style={styles.imageButtonsText}>Upload Image</ThemedText>
		</Pressable>
	);
	const toggleCameraBtn = (
		<Pressable
			style={[
				styles.imageButtons,
				{ flexDirection: "row" },
				cameraOpened && cameraReady ? { width: "55%" } : {},
			]}
			onPress={() => {
				toggleCamera(!useCamera);
				if (cameraOpened) return;
				let imgUri = imageUri;
				if (imgUri?.camUri) delete imgUri.camUri;
				setUpdatedImageUri({ ...imgUri });
			}}
		>
			<Text style={{ lineHeight: 30, marginRight: 5 }}>
				<Ionicons size={24} name="camera-outline" />
			</Text>
			<ThemedText style={styles.imageButtonsText}>
				{cameraOpened && cameraReady ? "Close Camera" : "Open"} Camera
			</ThemedText>
		</Pressable>
	);

	const saveCaptureBtn = (
		<Pressable
			style={styles.imageButtons}
			onPress={async () => {
				MediaLibrary.createAssetAsync(imageUri?.uri)
					.then((data) => {
						showToastWithMsg("Image saved to gallery!", 300);
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
			style={{ width: "100%", flexDirection: "row", justifyContent: "center" }}
		>
			<Pressable
				style={[
					styles.imageButtons,
					{ width: "100%", height: 55, flexDirection: "row" },
				]}
				onPress={() => setTimeout(tryDetection, 1, "auto")}
				disabled={!enableDetection || cameraOpened}
			>
				<Text style={{ lineHeight: 30, marginRight: 5 }}>
					<FontAwesome6 name="magnifying-glass" size={24} color="black" />
				</Text>
				<ThemedText
					style={[styles.imageButtonsText, { lineHeight: 30, fontSize: 26 }]}
				>
					Check Crop
				</ThemedText>
			</Pressable>
		</View>
	);

	const changeDetectionModel = (model_name: string) => {
		setPredictionClassLabel(to_pascal_case(model_name));
		setPredictionSubLabel("");
		setTimeout(tryDetection, 1, model_name);
		setShowModalDetectionModels(false);
	};

	const choseModelBtnStyle = {
		borderWidth: 2,
		borderRadius: 10,
		margin: 5,
		width: 100,
		selfAlign: "center",
		borderColor: themedTextClr,
	};

	const chooseDifferentDetectionModel = (
		<Modal
			isVisible={showModalDetectionModels}
			style={{ width: 350, height: 10, alignSelf: "center" }}
			onBackdropPress={() => setShowModalDetectionModels(false)}
		>
			<ThemedView style={[styles.centeredView, { zIndex: 9 }]}>
				<ThemedView
					style={[
						styles.modalView,
						{ height: 180, shadowColor: themedTintClr },
					]}
				>
					<ThemedText
						style={[styles.modalText, { fontSize: 20, fontWeight: "bold" }]}
					>
						Choose detection model
					</ThemedText>

					<View style={{ flexDirection: "row" }}>
						<Pressable
							style={choseModelBtnStyle}
							onPress={() => changeDetectionModel("beans")}
						>
							<ThemedText style={styles.textStyle}>Beans</ThemedText>
						</Pressable>
						<Pressable
							style={choseModelBtnStyle}
							onPress={() => changeDetectionModel("cassava")}
						>
							<ThemedText style={styles.textStyle}>Cassava</ThemedText>
						</Pressable>
					</View>
					<View style={{ flexDirection: "row" }}>
						<Pressable
							style={choseModelBtnStyle}
							onPress={() => changeDetectionModel("maize")}
						>
							<ThemedText style={styles.textStyle}>Maize</ThemedText>
						</Pressable>
						<Pressable
							style={choseModelBtnStyle}
							onPress={() => changeDetectionModel("tomato")}
						>
							<ThemedText style={styles.textStyle}>Tomato</ThemedText>
						</Pressable>
					</View>
				</ThemedView>
			</ThemedView>
		</Modal>
	);

	const down_arrow = (
		<FontAwesome
			name="chevron-down"
			size={26}
			color={useThemeColor({}, "text")}
		/>
	);

	const detectionOutputs = (
		// TODO: Buttons && Detections sections have in-consistent dark theme colors with app UI
		<ParallaxThemedView childrenStyle={styles.content}>
			<ThemedText type="title">Results</ThemedText>
			<ParallaxScrollView childrenStyle={styles.innerContent}>
				<View>
					<View
						style={{
							alignSelf: "center",
							alignItems: "center",
							justifyContent: "center",
							width: "100%",
							flexDirection: "row",
						}}
					>
						<ThemedText style={styles.detectionLabelText}>
							{predictionClassLabel !== "" ? "Crop: " : ""}
						</ThemedText>
						<Pressable
							style={[
								styles.cropDetectionLbl,
								predictionClassLabel !== ""
									? { borderColor: themedTextClr }
									: { borderColor: "#0000" },
							]}
							onPress={() => setShowModalDetectionModels(true)}
							disabled={!enableDetection || cameraOpened}
						>
							<ThemedText style={styles.detectionLabelText}>
								{predictionClassLabel}&nbsp;{predictionClassLabel && down_arrow}
							</ThemedText>
						</Pressable>
					</View>
					<ThemedText
						style={[
							styles.subLabelText,
							{
								backgroundColor: themedBackgroundClr,
							},
						]}
					>
						{predictionSubLabel && "Type:"} {predictionSubLabel}
					</ThemedText>
				</View>
				<Collapsible
					title="Crop disease prediction details"
					defaultOpen={false}
				>
					<ThemedText>No details provided.</ThemedText>
				</Collapsible>
			</ParallaxScrollView>
		</ParallaxThemedView>
	);

	const themedBackgroundStyle = {
		backgroundColor: useThemeColor({}, "background"),
	};

	return (
		<View style={[styles.pageContainer, themedBackgroundStyle]}>
			<Stack.Screen options={{ headerShown: false, title: "Home" }} />
			<View
				style={{
					alignItems: "center",
					marginTop: 30,
					justifyContent: "flex-start",
				}}
			>
				<ThemedText style={{ letterSpacing: 2 }} type="title"></ThemedText>
				<View style={styles.imageContainer}>
					{/* we don't wait for cameraReady since camera must be initiated first to enter ready state */}
					{cameraOpened ? cameraContent : imageContent}
				</View>
			</View>
			{detectionsToast}
			{detectionOutputs}
			<View style={{ alignSelf: "center", width: 300 }}>
				{enableDetection && !cameraOpened ? detectionBtn : <View></View>}
				{cameraOpened && cameraReady ? (
					<View>
						{captureCameraBtn}
						<View style={styles.imageButtonsContainer}>{toggleCameraBtn}</View>
					</View>
				) : (
					<View style={styles.imageButtonsContainer}>
						{imageUri?.camUri ? discardCaptureBtn : uploadImageBtn}
						{imageUri?.camUri ? saveCaptureBtn : toggleCameraBtn}
					</View>
				)}
			</View>
			{chooseDifferentDetectionModel}
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
		marginVertical: 5,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#7be",
		width: "55%",
		height: 45,
	},
	imageButtonsText: {
		fontWeight: "500",
		fontSize: 17,
		color: Colors.light.text,
	},
	imageButtonsContainer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 20,
	},
	detectionLabelText: {
		letterSpacing: 2,
		fontSize: 25,
		fontWeight: "700",
		paddingTop: 5,
		alignSelf: "center",
		gap: 5,
	},
	subLabelText: {
		letterSpacing: 2,
		fontSize: 20,
		fontWeight: "700",
		paddingTop: 15,
		paddingBottom: 20,
		alignSelf: "center",
		justifyContent: "center",
		gap: 15,
		alignItems: "center",
	},
	camCaptureImageBtn: {
		opacity: 0.6,
		backgroundColor: "#7be",
		width: "1000%",
		height: 55,
		marginTop: "auto",
		marginVertical: 5,
		justifyContent: "center",
		alignItems: "center",
		flexDirection: "row",
		alignSelf: "center",
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
	cropDetectionLbl: {
		paddingHorizontal: 10,
		paddingTop: 5,
		paddingBottom: 5,
		borderWidth: 2,
		borderRadius: 5,
		height: 45,
		alignSelf: "center",
	},
});
