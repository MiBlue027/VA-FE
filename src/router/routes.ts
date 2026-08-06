import {createRouter, createWebHistory, type RouteRecordRaw} from "vue-router";
import {RouterName} from "./router.name.ts";
import VAForm from "../modules/VA/Form/VAForm.vue";
import DocUploadForm from "../modules/VA/Form/DocUploadForm.vue";

const routes: RouteRecordRaw[] = [
    {
        path: "/virtual-assistant"
        , name: RouterName.VIRTUAL_ASSISTANT
        , component: VAForm
    },
    {
        path: "/document/upload"
        , name: RouterName.DOCUMENT_UPLOAD
        , component: DocUploadForm
    }
]

export const router = createRouter({
    history: createWebHistory()
    , routes: routes
})