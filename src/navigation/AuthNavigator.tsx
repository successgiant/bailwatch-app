import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { LoginScreen } from "../screens/LoginScreen"
import { ForgotPasswordScreen } from "../screens/ForgotPasswordScreen"
import { SignUpScreen } from "../screens/SignUpScreen"

const Stack = createNativeStackNavigator()

export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
    </Stack.Navigator>
  )
}
