/* Shim until @capacitor/push-notifications is installed on your machine
   (npm i @capacitor/push-notifications && npx cap sync). The client loads it
   through a vite-ignore dynamic import, so builds pass without the package. */
declare module "@capacitor/push-notifications";
