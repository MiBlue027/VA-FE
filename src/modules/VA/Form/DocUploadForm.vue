```vue
<script setup lang="ts">
import {
    computed,
    onMounted,
    ref
} from "vue";

import Http from "../../../miblue/helper/HttpHelper.ts";

interface DocumentHeader {
    docHId: number | string;
    docName: string;
    docCode: string;
}

interface DocumentDetail {
    docDId: number | string;
    docHId: number | string;
    sectionName: string;
    sectionCode: string;
}


const documentDetails = ref<DocumentDetail[] | null>(null);

const loadingDetails = ref(false);


const selectedHeaderDetails = computed<DocumentDetail[]>(() => {

    if (
            !selectedDocHId.value ||
            !documentDetails.value
    ) {
        return [];
    }

    return documentDetails.value.filter(
            detail =>
                    String(detail.docHId) ===
                    String(selectedDocHId.value)
    );
});

const getHeaderUrl =
        "http://localhost:5678/webhook/document/header/get-all";

const createHeaderUrl =
        "http://localhost:5678/webhook/document/header/create";

const getDetailUrl =
        "http://localhost:5678/webhook/document/detail/get-all";

const deleteDetailUrl =
        "http://localhost:5678/webhook/document/detail/delete";

const deleteDetailBatchUrl =
        "http://localhost:5678/webhook/document/detail/delete-batch";

const uploadUrl =
        "http://localhost:5678/webhook/document/upload";


/*
 * ============================================================
 * FILE
 * ============================================================
 */

const selectedFile = ref<File | null>(null);


/*
 * ============================================================
 * DOCUMENT HEADER
 * ============================================================
 */

const documentHeaders =
        ref<DocumentHeader[]>([]);

const selectedDocHId =
        ref<string>("");

const loadingHeaders =
        ref(false);

const showAddHeader =
        ref(false);

const creatingHeader =
        ref(false);

const newDocName =
        ref("");

const newDocCode =
        ref("");


/*
 * ============================================================
 * UPLOAD
 * ============================================================
 */

const sectionName =
        ref("");

const sectionCode =
        ref("");

const uploading =
        ref(false);


/*
 * ============================================================
 * LOAD DOCUMENT HEADERS
 * ============================================================
 */

const loadDocumentHeaders = async () => {

    loadingHeaders.value = true;

    try {

        const response = await Http.post<any>(
                getHeaderUrl,
                ""
        );

        console.log(
                "Document headers:",
                response
        );

        const data =
                Array.isArray(response)
                        ? response
                        : response?.data ?? [];

        documentHeaders.value = data;

    } catch (error) {

        console.error(
                "Failed to load document headers:",
                error
        );

        alert(
                "Gagal mengambil document header."
        );

    } finally {

        loadingHeaders.value = false;
    }
};


/*
 * ============================================================
 * LOAD DOCUMENT DETAILS
 * ============================================================
 *
 * HANYA DIPANGGIL SEKALI SAAT COMPONENT MOUNT.
 *
 * Setelah itu data disimpan di documentDetails.
 */

const loadDocumentDetails = async () => {

    /*
     * Kalau cache sudah tersedia,
     * jangan GET lagi.
     */
    if (documentDetails.value !== null) {
        return;
    }

    loadingDetails.value = true;

    try {

        const response = await Http.post<any>(
                getDetailUrl,
                "",
                {docHId: selectedDocHId.value}
        );

        console.log(
                "Document details:",
                response
        );

        const data =
                Array.isArray(response)
                        ? response
                        : response?.data ?? [];

        documentDetails.value = data;

    } catch (error) {

        console.error(
                "Failed to load document details:",
                error
        );

        alert(
                "Gagal mengambil document detail."
        );

    } finally {

        loadingDetails.value = false;
    }
};

const onDocumentHeaderChange = async () => {
    if (!selectedDocHId.value) {
        return;
    }

    /*
     * Kalau detail belum pernah diambil,
     * GET sekarang.
     *
     * Kalau sudah pernah diambil,
     * langsung menggunakan cache.
     */
    await loadDocumentDetails();
};


/*
 * ============================================================
 * SELECT FILE
 * ============================================================
 */

const onSelectFile = (
        event: Event
) => {

    const target =
            event.target as HTMLInputElement;

    if (
            !target.files ||
            target.files.length === 0
    ) {

        selectedFile.value = null;

        return;
    }

    const file =
            target.files[0];

    const extension =
            file.name
                    .split(".")
                    .pop()
                    ?.toLowerCase();

    if (
            ![
                "pdf",
                "doc",
                "docx"
            ].includes(extension ?? "")
    ) {

        alert(
                "Hanya mendukung file PDF, DOC, dan DOCX."
        );

        target.value = "";

        selectedFile.value = null;

        return;
    }

    selectedFile.value = file;
};


/*
 * ============================================================
 * CREATE DOCUMENT HEADER
 * ============================================================
 */

const createDocumentHeader = async () => {

    if (!newDocName.value.trim()) {

        alert(
                "Doc Name wajib diisi."
        );

        return;
    }

    if (!newDocCode.value.trim()) {

        alert(
                "Doc Code wajib diisi."
        );

        return;
    }

    creatingHeader.value = true;

    try {

        const response =
                await Http.post<any>(
                        createHeaderUrl,
                        "",
                        {
                            docName:
                                    newDocName.value.trim(),

                            docCode:
                                    newDocCode.value.trim()
                        }
                );

        console.log(
                "Created document header:",
                response
        );

        const createdHeader:
                DocumentHeader =
                response?.data ?? response;

        if (!createdHeader?.docHId) {

            alert(
                    "Document header berhasil dibuat, tetapi docHId tidak ditemukan."
            );

            await loadDocumentHeaders();

            return;
        }

        /*
         * Masukkan header baru ke cache.
         */
        documentHeaders.value.push(
                createdHeader
        );

        /*
         * Langsung pilih header yang baru dibuat.
         */
        selectedDocHId.value =
                String(
                        createdHeader.docHId
                );

        newDocName.value = "";
        newDocCode.value = "";

        showAddHeader.value = false;

        alert(
                "Document header berhasil dibuat."
        );

    } catch (error) {

        console.error(
                "Failed to create document header:",
                error
        );

        alert(
                "Gagal membuat document header."
        );

    } finally {

        creatingHeader.value = false;
    }
};


/*
 * ============================================================
 * DELETE ONE DOCUMENT DETAIL
 * ============================================================
 */

const deleteDocumentDetail = async (
        detail: DocumentDetail
) => {

    const confirmed =
            confirm(
                    `Hapus section "${detail.sectionName}"?`
            );

    if (!confirmed) {
        return;
    }

    try {

        await Http.post<any>(
                deleteDetailUrl,
                "",
                {
                    docDId:
                    detail.docDId
                }
        );

        /*
         * Hapus dari cache lokal.
         *
         * Tidak perlu GET ulang.
         */
        documentDetails.value = documentDetails.value?.filter(item =>
                                                                String(item.docDId) !==
                                                                String(detail.docDId)
                                                                ) ?? null;

        alert(
                "Document detail berhasil dihapus."
        );

    } catch (error) {

        console.error(
                "Failed to delete document detail:",
                error
        );

        alert(
                "Gagal menghapus document detail."
        );
    }
};


/*
 * ============================================================
 * DELETE ALL DETAILS FROM SELECTED HEADER
 * ============================================================
 */

const deleteAllDocumentDetails = async () => {

    if (!selectedDocHId.value) {

        alert(
                "Silakan pilih document header terlebih dahulu."
        );

        return;
    }

    const selectedHeader =
            documentHeaders.value.find(
                    header =>
                            String(header.docHId) ===
                            String(selectedDocHId.value)
            );

    const headerName =
            selectedHeader?.docName ??
            "header ini";

    const detailCount =
            selectedHeaderDetails.value.length;

    if (detailCount === 0) {

        alert(
                "Tidak ada document detail untuk header ini."
        );

        return;
    }

    const confirmed =
            confirm(
                    `Hapus semua ${detailCount} section dari "${headerName}"?`
            );

    if (!confirmed) {
        return;
    }

    try {

        await Http.post<any>(
                deleteDetailBatchUrl,
                "",
                {
                    docHId:
                    selectedDocHId.value
                }
        );

        /*
         * Hapus semua detail dari cache
         * yang memiliki docHId tersebut.
         */
        documentDetails.value =
                documentDetails.value?.filter(
                        detail =>
                                String(detail.docHId) !==
                                String(selectedDocHId.value)
                ) ?? null;

        alert(
                "Semua document detail berhasil dihapus."
        );

    } catch (error) {

        console.error(
                "Failed to delete document details:",
                error
        );

        alert(
                "Gagal menghapus semua document detail."
        );
    }
};


/*
 * ============================================================
 * UPLOAD DOCUMENT
 * ============================================================
 */

const uploadDocument = async () => {

    if (!selectedFile.value) {

        alert(
                "Silakan pilih file terlebih dahulu."
        );

        return;
    }

    if (!selectedDocHId.value) {

        alert(
                "Silakan pilih document header terlebih dahulu."
        );

        return;
    }

    if (!sectionName.value.trim()) {

        alert(
                "Section Name wajib diisi."
        );

        return;
    }

    if (!sectionCode.value.trim()) {

        alert(
                "Section Code wajib diisi."
        );

        return;
    }

    uploading.value = true;

    try {

        const request =
                new FormData();

        request.append(
                "file",
                selectedFile.value
        );

        request.append(
                "docHId",
                selectedDocHId.value
        );

        request.append(
                "sectionName",
                sectionName.value.trim()
        );

        request.append(
                "sectionCode",
                sectionCode.value.trim()
        );

        const response =
                await Http.post<any>(
                        uploadUrl,
                        "",
                        request
                );

        console.log(
                "Upload response:",
                response
        );

        alert(
                "Upload berhasil."
        );

        /*
         * Reset upload form.
         */
        selectedFile.value = null;
        sectionName.value = "";
        sectionCode.value = "";

        /*
         * Tidak melakukan GET detail lagi.
         *
         * Kalau endpoint upload memang membuat document detail,
         * tambahkan detail baru ke cache dari response upload.
         *
         * Jika response upload mengembalikan:
         *
         * {
         *     docDId,
         *     docHId,
         *     sectionName,
         *     sectionCode
         * }
         *
         * maka bisa langsung dimasukkan ke cache.
         */

        const uploadedDetail:
                DocumentDetail | null =
                response?.data?.docDId
                        ? response.data
                        : response?.docDId
                                ? response
                                : null;

        if (uploadedDetail) {

            documentDetails.value?.push(
                    uploadedDetail
            );
        }

    } catch (error) {

        console.error(
                "Upload failed:",
                error
        );

        alert(
                "Upload gagal."
        );

    } finally {

        uploading.value = false;
    }
};


/*
 * ============================================================
 * INITIAL LOAD
 * ============================================================
 *
 * GET HEADER  -> 1x
 * GET DETAIL  -> 1x
 *
 * Setelah itu tidak GET lagi ketika header berubah.
 */

onMounted(() => {

    loadDocumentHeaders();
});
</script>


<template>

    <div class="document-upload">

        <!-- ================================================== -->
        <!-- GLOBAL DOCUMENT HEADER -->
        <!-- ================================================== -->

        <section class="panel">

            <div class="section-header">

                <div>
                    <h2>
                        Document Header
                    </h2>

                    <p>
                        Global setting untuk menentukan
                        document yang akan digunakan.
                    </p>
                </div>

            </div>


            <div class="form-group">

                <label for="document-header">
                    Document Header
                </label>

                <div class="header-select-wrapper">

                    <select
                            id="document-header"
                            v-model="selectedDocHId"
                            :disabled="
            loadingHeaders ||
            uploading
        "
                            @change="onDocumentHeaderChange"
                    >
                        <option
                                value=""
                                disabled
                        >
                            {{
                                loadingHeaders
                                        ? "Loading..."
                                        : "Pilih Document Header"
                            }}
                        </option>

                        <option
                                v-for="header in documentHeaders"
                                :key="header.docHId"
                                :value="String(header.docHId)"
                        >
                            {{ header.docName }}
                            ({{ header.docCode }})
                        </option>
                    </select>


                    <button
                            type="button"
                            class="secondary-button"
                            :disabled="uploading"
                            @click="
                                showAddHeader =
                                    !showAddHeader
                            "
                    >
                        {{
                            showAddHeader
                                    ? "Cancel"
                                    : "Add"
                        }}
                    </button>

                </div>

            </div>


            <!-- ADD HEADER -->

            <div
                    v-if="showAddHeader"
                    class="add-header-form"
            >

                <h3>
                    Add Document Header
                </h3>


                <div class="form-group">

                    <label for="doc-name">
                        Doc Name
                    </label>

                    <input
                            id="doc-name"
                            v-model="newDocName"
                            type="text"
                            placeholder="Masukkan doc name"
                            :disabled="
                                creatingHeader
                            "
                    />

                </div>


                <div class="form-group">

                    <label for="doc-code">
                        Doc Code
                    </label>

                    <input
                            id="doc-code"
                            v-model="newDocCode"
                            type="text"
                            placeholder="Masukkan doc code"
                            :disabled="
                                creatingHeader
                            "
                    />

                </div>


                <button
                        type="button"
                        class="primary-button"
                        :disabled="
                            creatingHeader
                        "
                        @click="
                            createDocumentHeader
                        "
                >
                    {{
                        creatingHeader
                                ? "Creating..."
                                : "Create"
                    }}
                </button>

            </div>

        </section>


        <!-- ================================================== -->
        <!-- DOCUMENT DETAILS -->
        <!-- ================================================== -->

        <section class="panel">

            <div class="section-header">

                <div>
                    <h2>
                        Document Details
                    </h2>

                    <p>
                        Section yang tersedia pada
                        document header yang dipilih.
                    </p>
                </div>

                <button
                        v-if="
                    selectedHeaderDetails.length > 0
                "
                        type="button"
                        class="danger-button"
                        :disabled="uploading"
                        @click="deleteAllDocumentDetails"
                >
                    Delete All
                </button>

            </div>


            <!-- Belum pilih header -->

            <div
                    v-if="!selectedDocHId"
                    class="empty-state"
            >
                Pilih document header terlebih dahulu.
            </div>


            <!-- Sedang mengambil detail -->

            <div
                    v-else-if="loadingDetails"
                    class="empty-state"
            >
                Loading document details...
            </div>


            <!-- Tidak ada detail -->

            <div
                    v-else-if="
                selectedHeaderDetails.length === 0
            "
                    class="empty-state"
            >
                Belum ada document detail
                untuk header ini.
            </div>


            <!-- Detail table -->

            <div
                    v-else
                    class="table-wrapper"
            >

                <table>

                    <thead>
                    <tr>

                        <th>
                            Section Name
                        </th>

                        <th>
                            Section Code
                        </th>

                        <th class="action-column">
                            Action
                        </th>

                    </tr>
                    </thead>

                    <tbody>

                    <tr
                            v-for="
                            detail in selectedHeaderDetails
                        "
                            :key="detail.docDId"
                    >

                        <td>
                            {{ detail.sectionName }}
                        </td>

                        <td>
                            {{ detail.sectionCode }}
                        </td>

                        <td class="action-column">

                            <button
                                    type="button"
                                    class="delete-button"
                                    :disabled="uploading"
                                    @click="
                                    deleteDocumentDetail(
                                        detail
                                    )
                                "
                            >
                                Delete
                            </button>

                        </td>

                    </tr>

                    </tbody>

                </table>

            </div>

        </section>


        <!-- ================================================== -->
        <!-- UPLOAD DOCUMENT -->
        <!-- ================================================== -->

        <section class="panel">

            <div class="section-header">

                <div>

                    <h2>
                        Upload Document
                    </h2>

                    <p>
                        Upload document ke header yang
                        sedang dipilih.
                    </p>

                </div>

            </div>


            <!-- SECTION NAME -->

            <div class="form-group">

                <label for="section-name">
                    Section Name
                </label>

                <input
                        id="section-name"
                        v-model="sectionName"
                        type="text"
                        placeholder="Masukkan section name"
                        :disabled="
                            uploading ||
                            !selectedDocHId
                        "
                />

            </div>


            <!-- SECTION CODE -->

            <div class="form-group">

                <label for="section-code">
                    Section Code
                </label>

                <input
                        id="section-code"
                        v-model="sectionCode"
                        type="text"
                        placeholder="Masukkan section code"
                        :disabled="
                            uploading ||
                            !selectedDocHId
                        "
                />

            </div>


            <!-- FILE -->

            <div class="form-group">

                <label for="document-file">
                    Document
                </label>

                <input
                        id="document-file"
                        type="file"
                        accept=".pdf,.doc,.docx"
                        :disabled="
                            uploading ||
                            !selectedDocHId
                        "
                        @change="
                            onSelectFile
                        "
                />

            </div>


            <div
                    v-if="selectedFile"
                    class="file-name"
            >
                {{ selectedFile.name }}
            </div>


            <!-- UPLOAD -->

            <button
                    class="upload-button primary-button"
                    :disabled="
                        uploading ||
                        !selectedFile ||
                        !selectedDocHId ||
                        !sectionName.trim() ||
                        !sectionCode.trim()
                    "
                    @click="
                        uploadDocument
                    "
            >
                {{
                    uploading
                            ? "Uploading..."
                            : "Upload"
                }}
            </button>

        </section>

    </div>

</template>


<style scoped>

.document-upload {
    width: 720px;
    max-width: calc(100% - 32px);

    margin: 40px auto;

    display: flex;
    flex-direction: column;

    gap: 20px;
}


/*
 * ============================================================
 * PANEL
 * ============================================================
 */

.panel {
    padding: 24px;

    border: 1px solid #ddd;
    border-radius: 10px;

    background: #fff;

    display: flex;
    flex-direction: column;

    gap: 16px;
}


/*
 * ============================================================
 * HEADERS
 * ============================================================
 */

.section-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;

    gap: 16px;
}

h2 {
    margin: 0;

    font-size: 20px;
}

h3 {
    margin: 0;

    font-size: 16px;
}

.section-header p {
    margin: 5px 0 0;

    color: #777;

    font-size: 13px;
}


/*
 * ============================================================
 * FORM
 * ============================================================
 */

.form-group {
    display: flex;
    flex-direction: column;

    gap: 6px;
}

label {
    font-size: 14px;

    font-weight: 600;
}

input,
select {
    width: 100%;

    box-sizing: border-box;

    padding: 10px 12px;

    border: 1px solid #ccc;

    border-radius: 6px;

    font-size: 14px;

    background: #fff;
}

input:focus,
select:focus {
    outline: none;

    border-color: #888;
}


/*
 * ============================================================
 * HEADER SELECT
 * ============================================================
 */

.header-select-wrapper {
    display: flex;

    gap: 8px;
}

.header-select-wrapper select {
    flex: 1;
}


/*
 * ============================================================
 * ADD HEADER
 * ============================================================
 */

.add-header-form {
    padding: 16px;

    border: 1px solid #ddd;

    border-radius: 8px;

    background: #fafafa;

    display: flex;
    flex-direction: column;

    gap: 12px;
}


/*
 * ============================================================
 * BUTTON
 * ============================================================
 */

button {
    padding: 9px 14px;

    border: none;

    border-radius: 6px;

    cursor: pointer;

    font-size: 13px;

    white-space: nowrap;
}

button:disabled {
    cursor: not-allowed;

    opacity: 0.5;
}

.primary-button {
    background: #222;

    color: #fff;
}

.secondary-button {
    background: #eee;

    color: #333;
}

.danger-button,
.delete-button {
    background: #eee;

    color: #b42318;
}

.delete-button {
    padding: 6px 10px;
}

.upload-button {
    width: 100%;

    margin-top: 4px;

    padding: 11px;
}


/*
 * ============================================================
 * TABLE
 * ============================================================
 */

.table-wrapper {
    width: 100%;

    overflow-x: auto;

    border: 1px solid #ddd;

    border-radius: 8px;
}

table {
    width: 100%;

    border-collapse: collapse;

    font-size: 14px;
}

th,
td {
    padding: 11px 12px;

    text-align: left;

    border-bottom: 1px solid #eee;
}

th {
    background: #f7f7f7;

    font-weight: 600;
}

tbody tr:last-child td {
    border-bottom: none;
}

.action-column {
    width: 80px;

    text-align: center;
}


/*
 * ============================================================
 * EMPTY STATE
 * ============================================================
 */

.empty-state {
    padding: 24px;

    text-align: center;

    color: #777;

    font-size: 14px;

    background: #fafafa;

    border-radius: 8px;
}


/*
 * ============================================================
 * FILE
 * ============================================================
 */

.file-name {
    padding: 10px;

    background: #f5f5f5;

    border-radius: 6px;

    font-size: 14px;

    color: #666;

    word-break: break-all;
}

</style>
```
