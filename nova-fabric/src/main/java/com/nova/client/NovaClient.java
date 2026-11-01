package com.nova.client;

import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.keybinding.v1.KeyBindingHelper;
import net.minecraft.client.option.KeyBinding;
import net.minecraft.client.util.InputUtil;
import org.lwjgl.glfw.GLFW;

public final class NovaClient implements ClientModInitializer {
    public static boolean cpsEnabled = true;
    public static boolean keystrokesEnabled = true;
    public static boolean fpsEnabled = true;
    public static boolean coordinatesEnabled = false;
    public static boolean toggleSprintEnabled = false;

    @Override
    public void onInitializeClient() {
        KeyBinding openMenu = KeyBindingHelper.registerKeyBinding(new KeyBinding(
            "key.nova.open_menu",
            InputUtil.Type.KEYSYM,
            GLFW.GLFW_KEY_RIGHT_SHIFT,
            KeyBinding.Category.MISC
        ));

        ClientTickEvents.END_CLIENT_TICK.register(client -> {
            while (openMenu.wasPressed()) {
                if (client.currentScreen == null) {
                    client.setScreen(new NovaModScreen());
                } else if (client.currentScreen instanceof NovaModScreen) {
                    client.setScreen(null);
                }
            }
        });
    }
}
