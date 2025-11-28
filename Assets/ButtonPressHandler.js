//@input SceneObject mainMenuController;
//@input SceneObject button;


script.onPress = function(button_Event){
    switch (button_Event) {
        case "StartGame":
            print("Game is Starting");
            script.button.enabled = false;
            script.mainMenuController.enabled = true;
            break;
    
        default:
            break;
    }
}