import { Tabs } from "expo-router";
import React from "react";

import TabBarIcon from "@/components/navigation/TabBarIcon";
import { useThemeColor } from "@/hooks/useThemeColor";

const CameraTabIcon = ({ color, focused }: { color: any; focused: any }) => (
	<TabBarIcon name={focused ? "eye" : "eye-outline"} color={color} />
);

export default function TabLayout() {
	return (
		<Tabs
			screenOptions={{
				tabBarActiveTintColor: useThemeColor({}, "tint"),
				headerShown: false,
				sceneStyle: { backgroundColor: useThemeColor({}, "background") },
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					title: "Home",
					tabBarIcon: CameraTabIcon,
				}}
			/>
		</Tabs>
	);
}
