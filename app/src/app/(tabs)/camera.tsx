import { StyleSheet, View, Text } from "react-native";
import React from "react";
import {
	Camera,
	useCameraDevice,
	useCameraPermission,
} from "react-native-vision-camera";

/**
 * [X] 1. use react-native-camera for capturing the live feed
 * 2. use ort for launching the model
 *  2.1. processing the live feed and getting the output
 * [-] 2. use tflite
 * 3. use the output to display the result on the screen
 */

export const NoCameraDeviceError = () => {
	return (
		<View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
			<Text>No camera device found</Text>
		</View>
	);
};

type RequestPermissionProps = {
	requestPermissionFn: any;
};

export const PermissionsPage = ({
	requestPermissionFn,
}: RequestPermissionProps) => {
	requestPermissionFn();
	return (
		<View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
			<Text>Crop Diseases Detection App needs access to your Camera.</Text>
		</View>
	);
};

type CameraProps = {
	width: number;
	height: number;
};

const CameraLiveFeed = ({ width = -1, height = -1 }: CameraProps) => {
	const device = useCameraDevice("back");
	const { hasPermission, requestPermission } = useCameraPermission();

	if (!hasPermission)
		return <PermissionsPage requestPermissionFn={requestPermission} />;
	if (device == null) return <NoCameraDeviceError />;

	let cameraFeed = (
		<View style={{ flex: 1 }}>
			<Camera
				style={[StyleSheet.absoluteFill, styles.camera]}
				device={device}
				isActive={true}
			/>
			<Text style={{ color: "white" }}>CameraLiveFeed Detetion</Text>
		</View>
	);

	if (width > 0 && height > 0)
		return <View style={{ width: width, height: height }}>{cameraFeed}</View>;
	return cameraFeed;
};

export default CameraLiveFeed;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "black",
	},
	camera: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		// position: "absolute",
		// width: "100%",
		// maxWidth: -1,
		// maxHeight: -1,
	},
});
