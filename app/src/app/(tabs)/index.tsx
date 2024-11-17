import { useEffect, useRef, useState } from "react";
import {
	View,
	Image,
	StyleSheet,
	Pressable,
	ToastAndroid,
	FlatList,
	ScrollView,
} from "react-native";
import { useAppState } from "@react-native-community/hooks";
import { useIsFocused } from "@react-navigation/core";
import {
	Camera,
	useCameraDevice,
	useCameraPermission,
} from "react-native-vision-camera";
import { useTensorflowModel } from "react-native-fast-tflite";
import { useSharedValue } from "react-native-reanimated";
import * as ImagePicker from "react-native-image-picker";
import * as MediaLibrary from "expo-media-library";

import ParallaxScrollView from "@/components/ParallaxScrollView";
import ParallaxThemedView from "@/components/ParallaxThemedView";
import ThemedText from "@/components/ThemedText";
import Collapsible from "@/components/Collapsible";
import CameraLiveFeed, {
	NoCameraDeviceError,
	PermissionsPage,
} from "@/components/LiveCamera";
import MODELS from "@/constants/Models";
import { PredictionLabel } from "@/components/PredictionLabel";
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

// TODO: remove `console.log` statements, and review commented blocks

export default function HomeScreen() {
	let currentLabel = useSharedValue("");
	const model = useTensorflowModel(model_uri);
	const actual_model = model.state === "loaded" ? model.model : undefined;

	const labels_map = useSharedValue<string[] | null>(null);
	if (!labels_map.value)
		fetch_labels(labels_uri)
			.then((data: string) => (labels_map.value = data.split("\n")))
			.catch((e) => console.log("[MyErrLog-2] " + e));

	const isFocused = useIsFocused();
	const appState = useAppState();
	const [useCamera, setUseCamera] = useState(false);
	const cameraOpened = useCamera && isFocused && appState === "active";

	const { hasPermission, requestPermission } = useCameraPermission();
	const device = useCameraDevice("back");

	const toggleCamera = () => {
		if (useCamera) return setUseCamera(false);

		if (!hasPermission)
			return <PermissionsPage requestPermissionFn={requestPermission} />;

		if (device == null) return <NoCameraDeviceError />;

		setUseCamera(true);
	};

	const [enableDetection, setEnableDetection] = useState(false);

	// TODO: refactor this block (maybe with more meaningful variable names)
	const [updatedImageUri, setUpdatedImageUri] = useState<any>(null);
	const openImagePicker = (options: ImagePicker.ImageLibraryOptions) => {
		ImagePicker.launchImageLibrary(options, setUpdatedImageUri);
	};
	const [prevImageUri, setPrevImageUri] = useState<any>(null);
	const [imageUri, setImageUri] = useState<any>(null);
	const [imageContent, setImageContent] = useState<any>(null);

	useEffect(() => {
		console.log(
			`old prevImageUri before setting ${JSON.stringify(prevImageUri)}`
		);
		console.log(`old imageUri before setting ${JSON.stringify(imageUri)}`);
		console.log(`new image to be set ${JSON.stringify(updatedImageUri)}`);

		let skip = false;
		const newImageUri = updatedImageUri?.assets // source is image picker
			? { localUri: true, uri: updatedImageUri?.assets[0].uri }
			: updatedImageUri?.path // source is camera
			? { camUri: true, uri: `file://${updatedImageUri.path}` }
			: // use latest uploaded image after discarding cam capture
			updatedImageUri?.uri && !updatedImageUri?.camUri
			? (() => {
					const imgUri = { localUri: true, uri: updatedImageUri.uri };
					setImageUri(imgUri);
					return imgUri;
			  })()
			: // if all sources fail, check if current image is a valid then leave it as is
			imageUri?.uri && !imageUri?.camUri
			? (() => {
					skip = true;
					return imageUri;
			  })()
			: // otherwise, load default image
			  (() => require("@/assets/images/robot-outline.512.png"))();

		if (skip) {
			console.log(`there's no new image to be set`);
			return;
		}

		console.log(`the new imageUri has been set ${JSON.stringify(newImageUri)}`);

		get_img_model_input(newImageUri.uri)
			.then((img) => {
				console.log(`the new model input img has been set`);
				setImgInput(img);
			})
			.catch((e) => console.log(`[MyErrLog-3] ${e}`));

		setImageContent(
			<Image
				source={newImageUri}
				style={{ width: CAMERA_WIDTH, height: CAMERA_HEIGHT }}
			/>
		);

		if (!imageUri?.camUri) setPrevImageUri(imageUri);
		setImageUri(newImageUri);
	}, [updatedImageUri]);

	const [imgInput, setImgInput] = useState<any>(null);
	useEffect(() => {
		if (labels_map.value == null) return;
		if (actual_model == null) return;
		if (imgInput == null) return;

		const model_results = actual_model?.runSync([imgInput]);
		if (!model_results) {
			console.log("No inference results");
			return;
		}

		// console.log(`model results have been set ${JSON.stringify(model_results)}`);
		const inference_results = detectionModelPostProcess(model_results);
		if (!inference_results.length) {
			console.log("zero detections");
			return;
		}

		console.log(`[MyDbgLog] labels ${JSON.stringify(labels_map.value?.[0])}`);
		console.log(`[MyDbgLog] model ${JSON.stringify(actual_model)}`);
		console.log(`[MyDbgLog] img input ${JSON.stringify(imgInput?.[0])}`);

		// console.log(`Model loaded -- ${modelToString(actual_model)}]`);
		// console.log(`labels have been set with count = ${labels_map.value.length}`);

		// const result = resize(img_input, {
		// 	scale: {
		// 		// width: HEIGHT,
		// 		// height: WIDTH,
		// 		width: WIDTH,
		// 		height: HEIGHT,
		// 	},
		// 	dataType: TARGET_TYPE,
		// 	pixelFormat: TARGET_FORMAT,
		// 	rotation: "90deg",
		// });

		// console.log(`inference results have been set ${JSON.stringify(inference_results)}`);
		currentLabel.value = labels_map.value[inference_results[0].classIdx].trim();
		console.log(`output label is ${currentLabel.value}`);

		return () => {
			// clean local variables
			model_results;
			inference_results;
		};
	}, [actual_model, labels_map, imgInput]);

	const camera = useRef<Camera>(null);
	const previewCameraCapture = () => {
		console.log("capturing ...");
		camera.current
			?.takeSnapshot()
			.then((img) => {
				console.log(`capture img path: ${img.path}`);
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
			onPress={() => previewCameraCapture()}
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
				delete imgUri.camUri;
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
						console.log(`image saved to gallery: ${JSON.stringify(data)}`);
						ToastAndroid.show("image saved to gallery!", ToastAndroid.SHORT);
						setUpdatedImageUri(data);
					})
					.catch((e) => {
						console.log(`[MyErrLog] ${JSON.stringify(e)}`);
						console.log(`[MyErrLog] ${e}`);
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
				delete imgUri.camUri;
				console.log(
					`discarding, reverting back to ${JSON.stringify({ ...imgUri })}`
				);
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
			<Pressable style={styles.imageButtons} onPress={() => {}}>
				<ThemedText style={styles.imageButtonsText}>Check Crop</ThemedText>
			</Pressable>
		</View>
	);

	const detectionOutputs = (
		// TODO: Buttons && Detections sections have in-consistent dark theme colors with app UI
		<ParallaxThemedView childrenStyle={styles.content}>
			<ThemedText type="title">Results</ThemedText>
			<ParallaxScrollView childrenStyle={styles.innerContent}>
				<ThemedText>Type:</ThemedText>
				<PredictionLabel sharedValue={currentLabel} />
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
							data={labels_map.value}
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

				{cameraOpened ? (
					captureCameraBtn
				) : (
					<View style={styles.imageButtonsContainer}>
						{imageUri?.camUri ? discardCaptureBtn : uploadImageBtn}
						{imageUri?.camUri ? saveCaptureBtn : toggleCameraBtn}
					</View>
				)}
			</View>
			{detectionOutputs}
			{imgInput ? detectionBtn : <View></View>}
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
});
