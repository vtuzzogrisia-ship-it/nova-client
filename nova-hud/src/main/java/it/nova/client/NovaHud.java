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

import java.io.IOException;
import java.io.Reader;
import java.io.Writer;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Properties;

public final class NovaHud implements ClientModInitializer {
    private static KeyBinding menuKey;
    private static KeyBinding fpsKey;
    private static KeyBinding cpsKey;
    private static KeyBinding keysKey;
    private static KeyBinding coordinatesKey;
    private static KeyBinding sprintKey;

    public static boolean showFps = true;
    public static boolean showCps = true;
    public static boolean showKeys = true;
    public static boolean showCoordinates = true;
    public static boolean showSprint = true;

    // 0 = Top-Left, 1 = Top-Right, 2 = Bottom-Left, 3 = Bottom-Right
    public static int positionMode = 0;
    // 0 = Compatto (0.85x), 1 = Normale (1.0x), 2 = Grande (1.15x)
    public static int scaleMode = 1;
    // 0 = Viola NOVA, 1 = Ciano Neon, 2 = Verde Smeraldo, 3 = Arancio Solare, 4 = Bianco Neve
    public static int colorTheme = 0;
    // 0 = Trasparente (0x00), 1 = Basso (0x55), 2 = Medio (0x99), 3 = Opaco (0xEE)
    public static int bgOpacityMode = 2;

    private static boolean leftWasDown = false;
    private static boolean rightWasDown = false;
    private static final Deque<Long> leftClicks = new ArrayDeque<>();
    private static final Deque<Long> rightClicks = new ArrayDeque<>();

    public static final String[] POSITION_NAMES = {"In alto a sinistra", "In alto a destra", "In basso a sinistra", "In basso a destra"};
    public static final String[] SCALE_NAMES = {"Compatto (85%)", "Normale (100%)", "Grande (115%)"};
    public static final float[] SCALE_FACTORS = {0.85f, 1.0f, 1.15f};
    public static final String[] COLOR_NAMES = {"Viola NOVA", "Ciano Neon", "Smeraldo", "Arancio", "Bianco"};
    public static final int[] THEME_COLORS = {0xFFB99BFF, 0xFF5CE1E6, 0xFF8FE3C0, 0xFFFF9A55, 0xFFFFFFFF};
    public static final String[] OPACITY_NAMES = {"Trasparente", "Bassa (33%)", "Media (60%)", "Opaca (93%)"};
    public static final int[] OPACITY_ALPHAS = {0x00, 0x55, 0x99, 0xEE};

    private static Path configPath() {
        return FabricLoader.getInstance().getConfigDir().resolve("nova-hud.properties");
    }

    public static void loadConfig() {
        Properties config = new Properties();
        Path path = configPath();
        if (Files.isRegularFile(path)) {
            try (Reader reader = Files.newBufferedReader(path)) {
                config.load(reader);
            } catch (IOException ignored) {
                return;
            }
        }
        showFps = Boolean.parseBoolean(config.getProperty("showFps", "true"));
        showCps = Boolean.parseBoolean(config.getProperty("showCps", "true"));
        showKeys = Boolean.parseBoolean(config.getProperty("showKeys", "true"));
        showCoordinates = Boolean.parseBoolean(config.getProperty("showCoordinates", "true"));
        showSprint = Boolean.parseBoolean(config.getProperty("showSprint", "true"));

        try {
            positionMode = Math.floorMod(Integer.parseInt(config.getProperty("positionMode", "0")), 4);
            scaleMode = Math.floorMod(Integer.parseInt(config.getProperty("scaleMode", "1")), 3);
            colorTheme = Math.floorMod(Integer.parseInt(config.getProperty("colorTheme", "0")), 5);
            bgOpacityMode = Math.floorMod(Integer.parseInt(config.getProperty("bgOpacityMode", "2")), 4);
        } catch (NumberFormatException ignored) {}
    }

    public static void saveConfig() {
        Properties config = new Properties();
        config.setProperty("showFps", Boolean.toString(showFps));
        config.setProperty("showCps", Boolean.toString(showCps));
        config.setProperty("showKeys", Boolean.toString(showKeys));
        config.setProperty("showCoordinates", Boolean.toString(showCoordinates));
        config.setProperty("showSprint", Boolean.toString(showSprint));
        config.setProperty("positionMode", Integer.toString(positionMode));
        config.setProperty("scaleMode", Integer.toString(scaleMode));
        config.setProperty("colorTheme", Integer.toString(colorTheme));
        config.setProperty("bgOpacityMode", Integer.toString(bgOpacityMode));

        try {
            Path path = configPath();
            Files.createDirectories(path.getParent());
            try (Writer writer = Files.newBufferedWriter(path)) {
                config.store(writer, "NOVA CLIENT HUD Configuration");
            }
        } catch (IOException ignored) {}
    }

    public static void resetDefaults() {
        showFps = true;
        showCps = true;
        showKeys = true;
        showCoordinates = true;
        showSprint = true;
        positionMode = 0;
        scaleMode = 1;
        colorTheme = 0;
        bgOpacityMode = 2;
        saveConfig();
    }

    @Override
    public void onInitializeClient() {
        loadConfig();

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
        sprintKey = registerToggle("key.nova_hud.sprint", GLFW.GLFW_KEY_F10);

        ClientTickEvents.END_CLIENT_TICK.register(client -> {
            while (menuKey.wasPressed()) {
                if (client.currentScreen instanceof NovaMenuScreen) {
                    client.setScreen(null);
                } else {
                    client.setScreen(new NovaMenuScreen());
                }
            }
            while (fpsKey.wasPressed()) { showFps = !showFps; saveConfig(); }
            while (cpsKey.wasPressed()) { showCps = !showCps; saveConfig(); }
            while (keysKey.wasPressed()) { showKeys = !showKeys; saveConfig(); }
            while (coordinatesKey.wasPressed()) { showCoordinates = !showCoordinates; saveConfig(); }
            while (sprintKey.wasPressed()) { showSprint = !showSprint; saveConfig(); }

            // Toggle sprint logic
            if (showSprint && client.player != null && !client.player.isSneaking()
                    && client.options.forwardKey.isPressed() && !client.player.horizontalCollision) {
                client.player.setSprinting(true);
            }
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
        if (client.player == null || client.world == null || client.options.hudHidden) return;

        long now = System.currentTimeMillis();
        long window = client.getWindow().getHandle();
        updateClicks(window, now);

        int screenWidth = client.getWindow().getScaledWidth();
        int screenHeight = client.getWindow().getScaledHeight();

        float scale = SCALE_FACTORS[scaleMode];
        int primaryColor = THEME_COLORS[colorTheme];
        int bgAlpha = OPACITY_ALPHAS[bgOpacityMode];
        int bgColor = (bgAlpha << 24) | 0x14141E;

        context.getMatrices().push();
        if (scale != 1.0f) {
            context.getMatrices().scale(scale, scale, 1.0f);
        }

        int unscaledWidth = (int) (screenWidth / scale);
        int unscaledHeight = (int) (screenHeight / scale);

        int baseX;
        int baseY;
        if (positionMode == 0) { // Top-Left
            baseX = 10;
            baseY = 10;
        } else if (positionMode == 1) { // Top-Right
            baseX = unscaledWidth - 110;
            baseY = 10;
        } else if (positionMode == 2) { // Bottom-Left
            baseX = 10;
            baseY = unscaledHeight - 110;
        } else { // Bottom-Right
            baseX = unscaledWidth - 110;
            baseY = unscaledHeight - 110;
        }

        int y = baseY;

        if (showFps) {
            drawPill(context, client, "NOVA  " + client.getCurrentFps() + " FPS", baseX, y, primaryColor, bgColor);
            y += 14;
        }
        if (showCps) {
            drawPill(context, client, "CPS  L " + leftClicks.size() + "  R " + rightClicks.size(), baseX, y, 0xFFFFFFFF, bgColor);
            y += 14;
        }
        if (showCoordinates) {
            String coords = String.format("XYZ  %.1f  %.1f  %.1f", client.player.getX(), client.player.getY(), client.player.getZ());
            drawPill(context, client, coords, baseX, y, 0xFF8FE3C0, bgColor);
            y += 14;
        }
        if (showSprint && client.player.isSprinting()) {
            drawPill(context, client, "[Sprint: Attivo]", baseX, y, 0xFFFFB86C, bgColor);
            y += 14;
        }
        if (showKeys) {
            renderKeystrokes(context, client, baseX, y, primaryColor, bgAlpha);
        }

        context.getMatrices().pop();
    }

    private static void drawPill(DrawContext context, MinecraftClient client, String text, int x, int y, int textColor, int bgColor) {
        int textWidth = client.textRenderer.getWidth(text);
        if ((bgColor >>> 24) > 0) {
            context.fill(x - 3, y - 2, x + textWidth + 3, y + 10, bgColor);
        }
        context.drawTextWithShadow(client.textRenderer, text, x, y, textColor);
    }

    private static void renderKeystrokes(DrawContext context, MinecraftClient client, int baseX, int y, int activeColor, int bgAlpha) {
        drawKey(context, client, "W", client.options.forwardKey.isPressed(), baseX + 14, y + 2, activeColor, bgAlpha);
        drawKey(context, client, "A", client.options.leftKey.isPressed(), baseX, y + 15, activeColor, bgAlpha);
        drawKey(context, client, "S", client.options.backKey.isPressed(), baseX + 14, y + 15, activeColor, bgAlpha);
        drawKey(context, client, "D", client.options.rightKey.isPressed(), baseX + 28, y + 15, activeColor, bgAlpha);
        drawKey(context, client, "JUMP", client.options.jumpKey.isPressed(), baseX + 44, y + 15, activeColor, bgAlpha);
        drawKey(context, client, "LMB", leftWasDown, baseX, y + 28, activeColor, bgAlpha);
        drawKey(context, client, "RMB", rightWasDown, baseX + 44, y + 28, activeColor, bgAlpha);
    }

    private static void drawKey(DrawContext context, MinecraftClient client, String label, boolean pressed, int x, int y, int activeColor, int bgAlpha) {
        int keyWidth = label.length() > 1 ? 34 : 12;
        int color = pressed ? activeColor : ((bgAlpha << 24) | 0x222234);
        context.fill(x, y, x + keyWidth, y + 11, color);
        context.drawTextWithShadow(client.textRenderer, label, x + (label.length() > 1 ? 4 : 2), y + 2, pressed ? 0xFFFFFFFF : 0xFFB0B0C0);
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
