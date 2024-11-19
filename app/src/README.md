# Welcome to Crop Disease Early Detection app

Here you'll find a few extra things you need to do to get the app running quickly, and below you'll find Initial instructions for expo applications and android emulator, have a look at it to get the app running, but the first step right below should be done prior to the Expo instructions.

1. run `fetch-tensorflow-lite` script to download tflite src files since they're required for building the app.

2. run

    ```bash
    npm install
    ```

    to install all the dependencies, which will also automatically move downloaded tflite src files into their respective directory, `react-native-fast-tflite`.
  
3. In the instructions, you'll find a link to Android Emulator, follow the instructions closely to get the android emulator setup properly.

4. Inside `app/src` withing the repo directory, run `expo run:android` to start the app. The instructions mentions Expo Go, but we don't use it since it's not compatible with `react-native-vision-camera` which is a dependency for using the camera device.

---


# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
    npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
