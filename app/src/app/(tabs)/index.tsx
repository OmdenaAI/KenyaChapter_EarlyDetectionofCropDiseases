import { useEffect, useRef, useState } from "react";
import {
	View,
	Image,
	StyleSheet,
	Pressable,
	FlatList,
	ScrollView,
} from "react-native";
import Toast from "react-native-root-toast";

import { useAppState } from "@react-native-community/hooks";
import { useIsFocused } from "@react-navigation/core";
import {
	Camera,
	useCameraDevice,
	useCameraPermission,
} from "react-native-vision-camera";
import { useTensorflowModel } from "react-native-fast-tflite";
import * as ImagePicker from "react-native-image-picker";
import * as MediaLibrary from "expo-media-library";

import ParallaxScrollView from "@/components/ParallaxScrollView";
import ParallaxThemedView from "@/components/ParallaxThemedView";
import ThemedText from "@/components/ThemedText";
import Collapsible from "@/components/Collapsible";
import CameraLiveFeed, {
	CameraPermissionsPage,
	NoCameraDeviceError,
} from "@/components/LiveCamera";
import MODELS from "@/constants/Models";
import {
	detectionModelPostProcess,
	fetch_labels,
	get_img_model_input,
} from "@/components/Model";

const uploadImageOptions: ImagePicker.ImageLibraryOptions = {
	selectionLimit: 1,
	mediaType: "photo",
	includeBase64: false,
};

const CAMERA_WIDTH = 312;
const CAMERA_HEIGHT = 312;

const model_idx = 1;
const labels_uri = MODELS[model_idx].labels;
const model_uri = MODELS[model_idx].model;

const showRetryDetectionToast = (retries: number) => {
	let retries_txt = "";
	if (retries < 0 || retries > 2) retries_txt = "invalid retry";
	else retries_txt = ["1st try", "2nd try", "3rd try"][retries];

	Toast.show(`Retry running detection ... ${retries_txt}`, {
		visible: true,
		position: Toast.positions.BOTTOM,
		shadow: true,
		animation: true,
		delay: 500,
		hideOnPress: true,
	});
};

export default function HomeScreen() {
	const [predictionLabel, setPredictionLabel] = useState("");
	const model = useTensorflowModel(model_uri);
	const actual_model = model.state === "loaded" ? model.model : undefined;

	const [labels_map, setLabels_map] = useState<string[] | null>(null);
	if (!labels_map)
		fetch_labels(labels_uri)
			.then((data: string) => setLabels_map(data.split("\n")))
			.catch((e) => console.log("[MyErrLog-labelsMap] " + e));

	const isFocused = useIsFocused();
	const appState = useAppState();
	const [useCamera, setUseCamera] = useState(false);
	const cameraOpened = useCamera && isFocused && appState === "active";

	const { hasPermission, requestPermission } = useCameraPermission();
	const [showPermissionsRequestPage, setShowPermissionsRequestPage] =
		useState(false);

	const device = useCameraDevice("back");

	const toggleCamera = () => {
		if (useCamera) return setUseCamera(false);

		if (!hasPermission) setShowPermissionsRequestPage(true);

		if (device == null) return <NoCameraDeviceError />;

		setUseCamera(true);
	};

	// TODO: refactor this block (maybe with more meaningful variable names)
	const [updatedImageUri, setUpdatedImageUri] = useState<any>(null);
	const openImagePicker = (options: ImagePicker.ImageLibraryOptions) => {
		ImagePicker.launchImageLibrary(options, setUpdatedImageUri);
	};
	const [prevImageUri, setPrevImageUri] = useState<any>(null);
	const [imageUri, setImageUri] = useState<any>(null);
	const [imageContent, setImageContent] = useState<any>(null);
	const [imgInput, setImgInput] = useState<any>(null);
	const [enableDetection, setEnableDetection] = useState(false);

	const [imageSavedToastShow, setImageSavedToastShow] = useState(false);
	const imageSavedToast = (
		<Toast
			visible={imageSavedToastShow}
			position={Toast.positions.BOTTOM}
			shadow={true}
			animation={true}
			hideOnPress={true}
		>
			Image saved to gallery!
		</Toast>
	);

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

	useEffect(() => {
		let skip = false;
		let newImageUri = null;
		// source is image picker
		if (updatedImageUri?.assets)
			newImageUri = { localUri: true, uri: updatedImageUri?.assets[0].uri };
		// source is camera
		else if (updatedImageUri?.path)
			newImageUri = { camUri: true, uri: `file://${updatedImageUri.path}` };
		// use latest uploaded image after discarding cam capture
		else if (updatedImageUri?.uri && !updatedImageUri?.camUri)
			newImageUri = (() => {
				const imgUri = { localUri: true, uri: updatedImageUri.uri };
				setImageUri(imgUri);
				return imgUri;
			})();
		// if all sources fail, check if current image is a valid then leave it as is
		else if (imageUri?.uri && !imageUri?.camUri)
			newImageUri = (() => {
				skip = true;
				return imageUri;
			})();
		// otherwise, load default image
		else
			newImageUri = (() => {
				setImgInput(null);
				return require("@/assets/images/robot-outline.512.png");
			})();

		if (skip) {
			console.log(`[MyInfoLog-updatePreview] there's no new image to be set`);
			return;
		}

		if (newImageUri?.uri)
			get_img_model_input(newImageUri.uri)
				.then((img) => setImgInput(img))
				.catch((e) => console.log(`[MyErrLog-modelInput] ${e}`));

		setImageContent(
			<Image
				source={newImageUri}
				style={{ width: CAMERA_WIDTH, height: CAMERA_HEIGHT }}
			/>
		);

		setDetectionsToastShow(false);
		setPredictionLabel("");
		setTimeout(setImageSavedToastShow, 500, false);
		if (!imageUri?.camUri) setPrevImageUri(imageUri);
		setImageUri(newImageUri);
	}, [updatedImageUri]);

	const runDetection = () => {
		const detect = () => {
			if (!labels_map || !actual_model || !imgInput) return;

			const model_results = actual_model?.runSync([imgInput]);
			if (!model_results) {
				console.log("[MyErrLog-inference] No inference results");
				return;
			}

			const inference_results = detectionModelPostProcess(model_results);
			if (!inference_results.length) {
				console.log("[MyErrLog-detections] There're no detections");
				return;
			}
			return labels_map[inference_results[0].classIdx].trim();
		};

		let retries = 0;
		const tryDetection = () => {
			++retries;
			let detectionResult = detect();

			if (!detectionResult && retries < 3) {
				console.log(
					`[MyWarnLog-detection] Detection failed, Retry #${retries}`
				);
				showRetryDetectionToast(retries - 1);
				setTimeout(tryDetection, 1000);
			} else {
				setTimeout(setDetectionsToastShow, 300, false);
				setPredictionLabel(detectionResult ?? "Detection failed!");
			}
		};

		setDetectionsToastShow(true);
		// TODO: figure out how to move this function calling to another thread
		setTimeout(tryDetection, 1);
	};

	useEffect(() => {
		setEnableDetection(labels_map && actual_model && imgInput);
	}, [actual_model, labels_map, imgInput]);

	const camera = useRef<Camera>(null);
	const previewCameraCapture = () => {
		camera.current
			?.takeSnapshot()
			.then((img) => {
				setUpdatedImageUri(img);
				toggleCamera();
				return img;
			})
			.catch((e) => {
				console.log(`[MyErrLog-previewCamera] ${e}`);
			});
	};

	let cameraContent = <View></View>;
	if (cameraOpened)
		cameraContent = (
			<CameraLiveFeed
				cameraRef={camera}
				width={CAMERA_WIDTH}
				height={CAMERA_HEIGHT}
			/>
		);

	const captureCameraBtn = (
		<Pressable
			style={styles.imageButtons}
			onPress={() => {
				setShowPermissionsRequestPage(false);
				previewCameraCapture();
			}}
		>
			<ThemedText style={styles.imageButtonsText}>Capture</ThemedText>
		</Pressable>
	);
	const uploadImageBtn = (
		<Pressable
			style={styles.imageButtons}
			onPress={() => openImagePicker(uploadImageOptions)}
		>
			<ThemedText style={styles.imageButtonsText}>Upload Image</ThemedText>
		</Pressable>
	);
	const toggleCameraBtn = (
		<Pressable
			style={styles.imageButtons}
			onPress={() => {
				toggleCamera();
				let imgUri = imageUri;
				if (imgUri?.camUri) delete imgUri.camUri;
				setUpdatedImageUri({ ...imgUri });
			}}
		>
			<ThemedText style={styles.imageButtonsText}>
				{cameraOpened ? "Close" : "Open"} Camera
			</ThemedText>
		</Pressable>
	);

	const saveCaptureBtn = (
		<Pressable
			style={styles.imageButtons}
			onPress={async () => {
				MediaLibrary.createAssetAsync(imageUri?.uri)
					.then((data) => {
						setImageSavedToastShow(true);
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
				disabled={!enableDetection}
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
				<ThemedText>
					Type:&emsp;
					<ThemedText style={styles.detectionLabelText}>
						{predictionLabel.toUpperCase()}
					</ThemedText>
				</ThemedText>
				<Collapsible title="Crop disease prediction details" defaultOpen={true}>
					<ThemedText>Here goes a list of details if there're any.</ThemedText>
					<ThemedText>This list contains coco dataset classes:</ThemedText>
					{/* TODO: search for another way to solve nested identical orientation scrollviews  */}
					<ScrollView horizontal={true} showsHorizontalScrollIndicator={false}>
						<FlatList
							renderItem={({ item, index }) => (
								<ThemedText>
									{index} - {item}
								</ThemedText>
							)}
							data={labels_map}
						></FlatList>
					</ScrollView>
				</Collapsible>
			</ParallaxScrollView>
		</ParallaxThemedView>
	);

	return (
		<View style={styles.pageContainer}>
			<View style={{ alignItems: "center" }}>
				<ThemedText style={{ letterSpacing: 2 }} type="title">
					Welcome&thinsp;!
				</ThemedText>
				<View style={styles.imageContainer}>
					{cameraOpened ? cameraContent : imageContent}
				</View>

				{showPermissionsRequestPage && !hasPermission ? (
					<CameraPermissionsPage requestPermissionFn={requestPermission} />
				) : (
					<View></View>
				)}

				{cameraOpened && hasPermission ? (
					captureCameraBtn
				) : (
					<View style={styles.imageButtonsContainer}>
						{imageUri?.camUri ? discardCaptureBtn : uploadImageBtn}
						{imageUri?.camUri ? saveCaptureBtn : toggleCameraBtn}
					</View>
				)}
				{imageSavedToast}
			</View>
			{detectionsToast}
			{detectionOutputs}
			{enableDetection ? detectionBtn : <View></View>}
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
		gap: 16,
		overflow: "hidden",
	},
	pageContainer: {
		marginTop: 70,
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
		fontSize: 20,
		fontWeight: "700",
	},
});