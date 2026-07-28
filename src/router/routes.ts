import {createRouter, createWebHistory, type RouteRecordRaw} from "vue-router";
import {RouterName} from "./router.name.ts";
import VAForm from "../modules/VA/Form/VAForm.vue";

const routes: RouteRecordRaw[] = [
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