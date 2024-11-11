import {
	Text,
	View,
	Image,
	StyleSheet,
	Pressable,
	SafeAreaView,
} from "react-native";
import { useAppState } from "@react-native-community/hooks";
import { useIsFocused } from "@react-navigation/core";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import HelloWave from "@/components/HelloWave";
import ThemedText from "@/components/ThemedText";
import {
	// Camera,
	useCameraDevice,
	useCameraPermission,
	// useFrameProcessor,
} from "react-native-vision-camera";
import CameraLiveFeed, { NoCameraDeviceError, PermissionsPage } from "./camera";
import { useState } from "react";
import * as ImagePicker from "react-native-image-picker";
import { useSharedValue } from "react-native-worklets-core";

const uploadImageOptions: ImagePicker.ImageLibraryOptions = {
	selectionLimit: 0,
	mediaType: "photo",
	includeBase64: false,
};

export default function HomeScreen() {
	const loggingText = useSharedValue("Logging...");
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

	const [imagePreview, setImagePreview] = useState<any>(null);
	const openImagePicker = (options: ImagePicker.ImageLibraryOptions) => {
		ImagePicker.launchImageLibrary(options, setImagePreview);
	};
	let image = imagePreview?.assets
		? (() => {
				console.log(`imagePreview: ${JSON.stringify(imagePreview)}`);
				return { uri: imagePreview?.assets[0].uri };
		  })()
		: require("@/assets/images/robot-outline.512.png");
	let imageContent = (
		<Image source={image} style={{ width: 312, height: 312 }} />
	);

	let cameraContent = <View></View>;
	if (cameraOpened) cameraContent = <CameraLiveFeed width={312} height={312} />;

	return (
		<View style={styles.pageContainer}>
			<View style={{ alignItems: "center" }}>
				<ThemedText style={{ letterSpacing: 2 }} type="title">
					{" "}
					Welcome&thinsp;!{" "}
				</ThemedText>
				<View style={styles.imageContainer}>
					<ThemedText style={{ position: "absolute", zIndex: 999 }}>
						CameraLiveFeed Detection
					</ThemedText>
					{cameraOpened ? cameraContent : imageContent}
				</View>

				<View style={styles.imageButtonsContainer}>
					<Pressable
						style={styles.imageButtons}
						onPress={() => openImagePicker(uploadImageOptions)}
					>
						<ThemedText style={{ fontWeight: "500", fontSize: 17 }}>
							Upload Image
						</ThemedText>
					</Pressable>
					<Pressable style={styles.imageButtons} onPress={() => toggleCamera()}>
						<ThemedText style={{ fontWeight: "500", fontSize: 17 }}>
							Open Camera
						</ThemedText>
					</Pressable>
				</View>
			</View>

			<View style={{ flex: 1 }}>
				<ParallaxScrollView
					headerBackgroundColor={{ light: "#A1CEDC", dark: "#1D3D47" }}
					headerImage={
						<Image
							source={require("@/assets/images/partial-react-logo.png")}
							style={styles.reactLogo}
						/>
					}
				>
					<View style={styles.titleContainer}>
						<ThemedText type="title">Welcome!</ThemedText>
						<HelloWave />
					</View>
					<View style={styles.stepContainer}>
						<ThemedText type="subtitle">Step 3: Get a fresh start</ThemedText>
						<ThemedText>
							When you're ready, run&nbsp;
							<ThemedText type="defaultSemiBold">
								npm run reset-project
							</ThemedText>
							&ensp;to get a fresh&nbsp;
							<ThemedText type="defaultSemiBold">app</ThemedText> directory.
							This will move the current&nbsp;
							<ThemedText type="defaultSemiBold">app</ThemedText> to
							<ThemedText type="defaultSemiBold"> app-example</ThemedText>.
						</ThemedText>
					</View>
				</ParallaxScrollView>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	pageContainer: {
		marginTop: 70,
		flexDirection: "column",
		flex: 1,
		// justifyContent: "center",
		// backgroundColor: "#121212",
	},
	titleContainer: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
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
		width: 312,
		height: 312,
		minWidth: 312,
		minHeight: 312,
	},
	imageButtons: {
		borderColor: "#59c",
		borderStyle: "solid",
		borderWidth: 3,
		borderRadius: 10,
		padding: 9,
		margin: 10,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#7be",
	},
	imageButtonsContainer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
	},
});
