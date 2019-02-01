import TabWindow from "../scripts/commonWindows/TabWindow";
import Store from "../store/index";
import SETTINGS from "../store/Settings";

class ReactiveSwitch {
    constructor(parent, watch_key, def) {
        this.type = "switch";
        this.input = parent.data[watch_key];
        for(let key in def) {
            this[key] = def[key];
        }

        this.action = (val) => {
            this.input = val;
            parent.data[watch_key] = val;
            parent.save();
        };
    }
}

export default class SettingsWindow extends TabWindow {
    constructor() {     
        super("Settings", { is_persistent: false }, "bridge.core.settings_window.");
        this.data = SETTINGS.load();
        
        this.addTab({
            sidebar_element: {
                icon: "mdi-code-braces",
                title: "Editor"
            },
            content: [
                new ReactiveSwitch(this, "use_tabs", { color: "light-green", text: "Use Tabs", key: `settings.editor.tab.tabs.${Math.random()}` }),
                new ReactiveSwitch(this, "line_wraps", { color: "light-green", text: "Word Wrap", key: `settings.editor.tab.tabs.${Math.random()}` }),
                new ReactiveSwitch(this, "auto_completions", { color: "light-green", text: "Provide Auto-Completions", key: `settings.editor.tab.auto_completions.${Math.random()}` })
            ]
        });
        this.addTab({
            sidebar_element: {
                icon: "mdi-flower-tulip",
                title: "Appearance"
            },
            content: [
                new ReactiveSwitch(this, "is_dark_mode", { color: "light-green", text: "Dark Mode", key: `settings.appearance.tab.${Math.random()}` }),
                new ReactiveSwitch(this, "inversed_arrows", { color: "light-green", text: "Inverse Arrows", key: `settings.editor.tab.arrows.${Math.random()}` })
            ]
        });
        this.addTab({
            sidebar_element: {
                icon: "mdi-cogs",
                title: "Developer Mode"
            },
            content: [
                new ReactiveSwitch(this, "is_dev_mode", { color: "error", text: "Asserts", key: `settings.dev.tab.${Math.random()}` })
            ]
        });

        this.update();
    }

    save() {
        Store.commit("setSettings", this.data);
        SETTINGS.save(this.data);
    }
}