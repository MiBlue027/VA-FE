<script setup lang="ts">
import { ref } from "vue";
import Http from "../../../miblue/helper/HttpHelper.ts";

const webhookUrl = "http://localhost:5678/webhook-test/3c91749c-4f09-4113-8882-806a885d9ee5";

const selectedFile = ref<File | null>(null);
const uploading = ref(false);

const onSelectFile = (event: Event) => {
    const target = event.target as HTMLInputElement;

    if (!target.files || target.files.length === 0) {
        selectedFile.value = null;
        return;
    }

    const file = target.files[0];

    const extension = file.name.split(".").pop()?.toLowerCase();

    if (!["pdf", "doc", "docx"].includes(extension ?? "")) {
        alert("Hanya mendukung file PDF, DOC, dan DOCX.");
        target.value = "";
        return;
    }

    selectedFile.value = file;
};

const uploadDocument = async () => {
    if (!selectedFile.value) {
        alert("Silakan pilih file terlebih dahulu.");
        return;
    }

    uploading.value = true;

    try {
        const request = new FormData();
        request.append("file", selectedFile.value);

        const response = await Http.post<any>(
                webhookUrl,
                "",
                request
        );

        console.log(response);
        alert("Upload berhasil.");
    } catch (error) {
        console.error(error);
        alert("Upload gagal.");
    } finally {
        uploading.value = false;
    }
};
</script>

<template>
    <div class="document-upload">

        <h2>Upload Document</h2>

        <input
                type="file"
                accept=".pdf,.doc,.docx"
                @change="onSelectFile"
        />

        <div
                v-if="selectedFile"
                class="file-name"
        >
            {{ selectedFile.name }}
        </div>

        <button
                :disabled="uploading || !selectedFile"
                @click="uploadDocument"
        >
            {{ uploading ? "Uploading..." : "Upload" }}
        </button>

    </div>
</template>

<style scoped>
.document-upload{
    width:420px;
    margin:40px auto;
    padding:24px;
    border:1px solid #ddd;
    border-radius:10px;
    display:flex;
    flex-direction:column;
    gap:16px;
}

.file-name{
    font-size:14px;
    color:#666;
}

button{
    padding:10px;
    cursor:pointer;
}

button:disabled{
    cursor:not-allowed;
    opacity:.5;
}
</style>