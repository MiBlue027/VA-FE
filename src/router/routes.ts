import {createRouter, createWebHistory, type RouteRecordRaw} from "vue-router";
import {RouterName} from "./router.name.ts";
import Live2D from "../modules/VA/components/Live2D.vue";
import VAForm from "../modules/VA/Form/VAForm.vue";

const routes: RouteRecordRaw[] = [
    {
        path: "/test/live2d-mod"
        , name: RouterName.LIVE_2D_MOD
        , component: Live2D
    },
    {
        path: "/virtual-assistant"
        , name: RouterName.VIRTUAL_ASSISTANT
        , component: VAForm
    }
]

export const router = createRouter({
    history: createWebHistory()
    , routes: routes
})