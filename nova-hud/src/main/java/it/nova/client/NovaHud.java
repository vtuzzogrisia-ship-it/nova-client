package it.nova.client;

import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.loader.api.FabricLoader;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.keybinding.v1.KeyBindingHelper;
import net.fabricmc.fabric.api.client.rendering.v1.HudLayerRegistrationCallback;
import net.fabricmc.fabric.api.client.rendering.v1.IdentifiedLayer;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.option.KeyBinding;
import net.minecraft.client.render.RenderTickCounter;
import net.minecraft.client.util.InputUtil;
import net.minecraft.util.Identifier;
import org.lwjgl.glfw.GLFW;

import java.util.ArrayDeque;
import java.util.Deque;
import java.io.IOException;
import java.io.Reader;
import java.io.Writer;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Properties;

public final class NovaHud implements ClientModInitializer {
    private static KeyBinding menuKey;
    private static KeyBinding fpsKey;
    private static KeyBinding cpsKey;
    private static KeyBinding keysKey;
    private static KeyBinding coordinatesKey;
    static boolean showFps = true;
    static boolean showCps = true;
    static boolean showKeys = true;
    static boolean showCoordinates = true;
    private static boolean leftWasDown = false;
    private static boolean rightWasDown = false;
    private static final Deque<Long> leftClicks = new ArrayDeque<>();
    private static final Deque<Long> rightClicks = new ArrayDeque<>();
    private static Path configPath() { return FabricLoader.getInstance().getConfigDir().resolve("nova-hud.properties"); }

    private static void loadConfig() {
        Properties config = new Properties();
        Path path = configPath();
        if (Files.isRegularFile(path)) {
            try (Reader reader = Files.newBufferedReader(path)) { config.load(reader); }
            catch (IOException ignored) { return; }
        }
        showFps = Boolean.parseBoolean(config.getProperty("showFps", "true"));
        showCps = Boolean.parseBoolean(config.getProperty("showCps", "true"));
        showKeys = Boolean.parseBoolean(config.getProperty("showKeys", "true"));
        showCoordinates = Boolean.parseBoolean(config.getProperty("showCoordinates", "true"));
    }

    private static void saveConfig() {
        Properties config = new Properties();
        config.setProperty("showFps", Boolean.toString(showFps));
        config.setProperty("showCps", Boolean.toString(showCps));
        config.setProperty("showKeys", Boolean.toString(showKeys));
        config.setProperty("showCoordinates", Boolean.toString(showCoordinates));
        try {
            Path path = configPath();
            Files.createDirectories(path.getParent());
            try (Writer writer = Files.newBufferedWriter(path)) { config.store(writer, "NOVA HUD settings"); }
        } catch (IOException ignored) { /* HUD remains usable when config storage is unavailable. */ }
    }

    static void setShowFps(boolean value) { showFps = value; saveConfig(); }
    static void setShowCps(boolean value) { showCps = value; saveConfig(); }
    static void setShowKeys(boolean value) { showKeys = value; saveConfig(); }
    static void setShowCoordinates(boolean value) { showCoordinates = value; saveConfig(); }

    @Override
    public void onInitializeClient() {
        menuKey = KeyBindingHelper.registerKeyBinding(new KeyBinding(
                "key.nova_hud.menu",
                InputUtil.Type.KEYSYM,
                GLFW.GLFW_KEY_RIGHT_SHIFT,
                "category.nova_hud"
        ));
        fpsKey = registerToggle("key.nova_hud.fps", GLFW.GLFW_KEY_F6);
        cpsKey = registerToggle("key.nova_hud.cps", GLFW.GLFW_KEY_F7);
        keysKey = registerToggle("key.nova_hud.keystrokes", GLFW.GLFW_KEY_F8);
        coordinatesKey = registerToggle("key.nova_hud.coordinates", GLFW.GLFW_KEY_F9);
        ClientTickEvents.END_CLIENT_TICK.register(client -> {
            while (menuKey.wasPressed()) {
                if (client.currentScreen instanceof NovaMenuScreen) client.setScreen(null);
                else client.setScreen(new NovaMenuScreen());
            }
            while (fpsKey.wasPressed()) setShowFps(!showFps);
            while (cpsKey.wasPressed()) setShowCps(!showCps);
            while (keysKey.wasPressed()) setShowKeys(!showKeys);
            while (coordinatesKey.wasPressed()) setShowCoordinates(!showCoordinates);
        });
        HudLayerRegistrationCallback.EVENT.register(layers -> layers.attachLayerAfter(
                IdentifiedLayer.EXPERIENCE_LEVEL,
                Identifier.of("nova_hud", "main_hud"),
                NovaHud::render
        ));
    }

    private static KeyBinding registerToggle(String translationKey, int keyCode) {
        return KeyBindingHelper.registerKeyBinding(new KeyBinding(translationKey, InputUtil.Type.KEYSYM, keyCode, "category.nova_hud"));
    }

    private static void render(DrawContext context, RenderTickCounter tickCounter) {
        MinecraftClient client = MinecraftClient.getInstance();
        if (client.player == null || client.world == null) return;

        long now = System.currentTimeMillis();
        long window = client.getWindow().getHandle();
        updateClicks(window, now);
        int y = 10;

        if (showFps) {
            context.drawTextWithShadow(client.textRenderer, "NOVA  " + client.getCurrentFps() + " FPS", 10, y, 0xFFB99BFF);
            y += 12;
        }
        if (showCps) {
            context.drawTextWithShadow(client.textRenderer,
                    "CPS  L " + leftClicks.size() + "  R " + rightClicks.size(), 10, y, 0xFFFFFFFF);
            y += 12;
        }
        if (showCoordinates) {
            context.drawTextWithShadow(client.textRenderer,
                    String.format("XYZ  %.1f  %.1f  %.1f", client.player.getX(), client.player.getY(), client.player.getZ()),
                    10, y, 0xFF8FE3C0);
            y += 12;
        }
        if (showKeys) {
            drawKey(context, client, "W", client.options.forwardKey.isPressed(), 40, y + 2);
            drawKey(context, client, "A", client.options.leftKey.isPressed(), 28, y + 14);
            drawKey(context, client, "S", client.options.backKey.isPressed(), 40, y + 14);
            drawKey(context, client, "D", client.options.rightKey.isPressed(), 52, y + 14);
            drawKey(context, client, "JUMP", client.options.jumpKey.isPressed(), 70, y + 14);
            drawKey(context, client, "LMB", leftWasDown, 28, y + 28);
            drawKey(context, client, "RMB", rightWasDown, 70, y + 28);
        }


    }

    private static void drawKey(DrawContext context, MinecraftClient client, String label, boolean pressed, int x, int y) {
        int color = pressed ? 0xFF8056D9 : 0xB8202030;
        context.fill(x, y, x + (label.length() > 1 ? 34 : 11), y + 11, color);
        context.drawTextWithShadow(client.textRenderer, label, x + 2, y + 2, 0xFFFFFFFF);
    }

    private static void updateClicks(long window, long now) {
        boolean left = GLFW.glfwGetMouseButton(window, GLFW.GLFW_MOUSE_BUTTON_LEFT) == GLFW.GLFW_PRESS;
        boolean right = GLFW.glfwGetMouseButton(window, GLFW.GLFW_MOUSE_BUTTON_RIGHT) == GLFW.GLFW_PRESS;
        if (left && !leftWasDown) leftClicks.addLast(now);
        if (right && !rightWasDown) rightClicks.addLast(now);
        leftWasDown = left;
        rightWasDown = right;
        while (!leftClicks.isEmpty() && now - leftClicks.peekFirst() > 1000) leftClicks.removeFirst();
        while (!rightClicks.isEmpty() && now - rightClicks.peekFirst() > 1000) rightClicks.removeFirst();
    }
}
