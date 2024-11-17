import { StyleSheet, View, Text } from "react-native";
import React, { Ref, RefObject } from "react";
import {
	Camera,
	useCameraDevice,
	useCameraFormat,
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
			<Text>All Crop Diseases Detection App to access your Camera.</Text>
		</View>
	);
};

type CameraProps = {
	cameraRef?: RefObject<Camera>;
	width: number;
	height: number;
};

const CameraLiveFeed = ({
	cameraRef,
	width = -1,
	height = -1,
}: CameraProps) => {
	const device = useCameraDevice("back");
	const { hasPermission, requestPermission } = useCameraPermission();

	if (!hasPermission)
		return <PermissionsPage requestPermissionFn={requestPermission} />;
	if (device == null) return <NoCameraDeviceError />;

	const cameraFormat = useCameraFormat(device, [
		{ photoAspectRatio: 1 / 1 },
		{ photoResolution: { width: width, height: height } },
		{ fps: 2 },
	]);

	let cameraFeed = (
		<View style={{ flex: 1 }}>
			<Camera
				style={[StyleSheet.absoluteFill, styles.camera]}
				ref={cameraRef}
				device={device}
				isActive={true}
				photo={true}
				format={cameraFormat}
				fps={[2, 2]}
				photoQualityBalance="speed"
			/>
			<Text style={{ color: "white" }}>CameraLiveFeed Detection</Text>
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
	},
});
