<template>
    <p v-if="first && file_explorer.children === 0 && !file_explorer.is_loading">
        This directory has no content.
    </p>
    <v-progress-linear v-else-if="file_explorer.is_loading" indeterminate/>
    <div :style="element_style" :class="element_class" v-else>
        <draggable 
            v-model="file_explorer.children"
            v-bind="{ group: `file-displayer-${move_group}`, disabled: first }"
            @change="draggedFile"
        >
            <template v-for="(file) in file_explorer.children">
                    <!--LOADING-->
                     <v-skeleton-loader
                        v-if="file.is_loading"
                        :key="file.absolute_path"
                        height="21"
                        type="text"
                    ></v-skeleton-loader>
                    <!--FOLDER-->
                    <details
                        v-else-if="file.is_folder"
                        :open="file.is_open && !file.absolute_path.includes('cache')"
                        :key="file.uuid"
                    >
                        <summary
                            @click="file.is_open ? file.close() : file.open()"
                            @contextmenu="(event) => showFolderContextMenu(event, file.absolute_path, file)"
                            v-ripple="!file.absolute_path.includes('cache')"
                        >
                            <v-icon class="open" small>mdi-folder-open</v-icon>
                            <v-icon class="closed" small>{{ file.absolute_path.includes('cache') ? 'mdi-folder-lock' : 'mdi-folder' }}</v-icon>
                            <span class="folder"> {{ file.name }}</span>
                        </summary>
                        <file-displayer
                            v-if="file.is_open"
                            :first="false"
                            :project="project"
                            :base_path="base_path"
                            :explorer_type="explorer_type"
                            :prop_explorer="file"
                            :move_group="first ? file.name : move_group"
                        />
                    </details>

                    <!--FILE-->
                    <div 
                        v-else
                        :key="file.absolute_path"
                        class="file"
                        @click.stop="openFile(file.absolute_path)"
                        @contextmenu="(event) => showContextMenu(event, file.absolute_path, file)"
                        v-ripple
                    >
                        <v-icon small>{{ getIcon(file.absolute_path) }}</v-icon> {{ file.name }}
                    </div>
            </template>
        </draggable>
    </div>
</template>

<script>
    import fse from "fs-extra";
    import path from "path";
    import draggable from "vuedraggable";
    import FileSystem from "../../../../scripts/FileSystem";
    import LoadingWindow from "../../../../windows/LoadingWindow";
    import OmegaCache from '../../../../scripts/editor/OmegaCache';
    import LightningCache from '../../../../scripts/editor/LightningCache';
    import { JSONFileMasks } from '../../../../scripts/editor/JSONFileMasks';
    import { FileExplorer, FileExplorerStorage } from "../../../../scripts/Sidebar/FileExplorer";
    import EventBus from '../../../../scripts/EventBus';
    import InformationWindow from '../../../../scripts/commonWindows/Information';
    import { FILE_CONTEXT_MENU } from '../../../../scripts/contextMenus/File';
    import { FOLDER_CONTEXT_MENU } from '../../../../scripts/contextMenus/Folder';
    import FileType from '../../../../scripts/editor/FileType';

    export default {
        name: "file-displayer",
        props: {
            first: {
                default: true,
                type: Boolean
            },
            base_path: String,
            project: String,
            explorer_type: String,
            prop_explorer: Object,
            move_group: String
        },
        components: {
            draggable
        },
        data() {
            return {
                file_displayer_height: window.innerHeight - 199,
                file_explorer: undefined
            };
        },
        created() {
            if(this.first) {
                window.addEventListener("resize", this.on_resize);
                EventBus.on("bridge:refreshExplorer", this.refreshExplorer);
            }

            if(this.prop_explorer) return this.file_explorer = this.prop_explorer;
            if(FileExplorerStorage.get(this.explorer_type, this.project) === undefined) {
                FileExplorerStorage.set(
                    this.explorer_type,
                    this.project,
                    new FileExplorer(undefined, this.project, path.join(this.base_path, this.project)).open()
                );
            }
            this.file_explorer = FileExplorerStorage.get(this.explorer_type, this.project);
        },
        destroyed() {
            if(this.first) {
                window.removeEventListener("resize", this.on_resize);
                EventBus.off("bridge:refreshExplorer", this.refreshExplorer);
            }
        },
        computed: {
            element_style() {
                return this.first ? `max-height: ${this.file_displayer_height}px; padding: 4px;` : "";
            },
            element_class() {
                return this.first ? "file-displayer px14-font" : "px14-font";
            }
        },
        methods: {
            refreshExplorer() {
                this.file_explorer.refresh();
            },
            openFile(path) {
                if(!this.$store.state.LoadingWindow["open-file"]) {
                    new LoadingWindow("open-file").show();
                    FileSystem.open(path);
                } 
            },
            getIcon(file_path) {
                return FileType.getFileIcon(file_path) ||
                    this.$store.state.Appearance.files[path.extname(file_path)] ||
                    "mdi-file-document-outline";
            },
            on_resize(e) {
                this.file_displayer_height = window.innerHeight - 199;
            },
            async draggedFile({ removed, moved, added }) {
                if(added !== undefined) {
                    let { absolute_path, name } = added.element;
                    try {
                        await fse.move(absolute_path, path.join(this.file_explorer.absolute_path, name));
                        added.element.update(this.file_explorer.absolute_path, this.file_explorer.path);
                    } catch(e) {
                        new InformationWindow("ERROR", "Failed to move file/folder because a file/folder with the same name already exists.");
                        EventBus.trigger("bridge:refreshExplorer");
                    }
                }
                if(removed === undefined) this.file_explorer.sort();          
            },
            async showContextMenu(event, file_path, file) {
                this.$store.commit("openContextMenu", {
                    x_position: event.clientX,
                    y_position: event.clientY,
                    menu: await FILE_CONTEXT_MENU(file_path, file)
                });
            },
            async showFolderContextMenu(event, file_path, file) {
                this.$store.commit("openContextMenu", {
                    x_position: event.clientX,
                    y_position: event.clientY,
                    menu: await FOLDER_CONTEXT_MENU(file_path, file)
                });
            }
        },
        watch: {
            project(new_project) {
                if(!this.first) return;

                if(FileExplorerStorage.get(this.explorer_type, this.project) === undefined) {
                    FileExplorerStorage.set(
                        this.explorer_type,
                        this.project,
                        new FileExplorer(undefined, this.project, path.join(this.base_path, this.project)).open()
                    );
                }
                this.file_explorer = FileExplorerStorage.get(this.explorer_type, this.project);
            }
        }
    }
</script>

<style scoped>
    div {
        padding-left: 0.5em;
    }
    div.file {
        cursor: pointer;
        overflow-x: auto;
        white-space: nowrap;
    }
    div.file::-webkit-scrollbar, span.folder::-webkit-scrollbar  {
        width: 2px;
        height: 2px;
    }
    span.folder {
        overflow-x: auto;
        white-space: nowrap;
    }

    summary {
        outline: none;
        cursor: pointer;
    }
    summary::-webkit-details-marker {
        display: none
    }
    details[open]  > summary > .open {
        display: inline;
    }
    details > summary > .open {
        display: none;
    }
    details[open]  > summary > .closed {
        display: none;
    }
    details > summary > .closed {
        display: inline;
    }

    .file-displayer {
        overflow-y: auto;
    }
</style>