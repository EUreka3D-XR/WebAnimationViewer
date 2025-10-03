/* global BABYLON, JSZip */
const canvas = document.getElementById("renderCanvas");
const animationSelect = document.getElementById("animationSelect");
let engine, scene, currentAnim = null, animationGroups = [], song, audioEngine = null;
let audioUrl = null;

async function initBabylon() {
    BABYLON.Engine.audioEngine = new BABYLON.AudioEngine();
    engine = new BABYLON.Engine(canvas, true);
    scene = new BABYLON.Scene(engine);
    scene.createDefaultCameraOrLight(true, true, true);
    scene.activeCamera.attachControl(canvas, true);

    engine.runRenderLoop(() => {
        scene.render();
    });

    window.addEventListener("resize", () => engine.resize());
}

async function loadZipFromUrl(proxyUrl, zipDirectUrl) {
    console.log("Fetching ZIP via proxy:", zipDirectUrl);

    // Using a proxy to fetch the ZIP file, it can be changed to EUREKA's server side proxy.
    const proxiedUrl = `${proxyUrl}${zipDirectUrl}`;
    const response = await fetch(proxiedUrl);
    const arrayBuffer = await response.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    let modelFile = null;
    let audioFile = null;

    const supportedModelExtensions = /\.(glb|gltf|obj|stl|splat|ply)$/i;
    const supportedAudioExtensions = /\.mp3$/i;

    zip.forEach((relativePath, zipEntry) => {
        if (!modelFile && supportedModelExtensions.test(zipEntry.name)) {
            modelFile = zipEntry;
        } else if (!audioFile && supportedAudioExtensions.test(zipEntry.name)) {
            audioFile = zipEntry;
        }
    });

    if (!modelFile || !audioFile) {
        console.error("Model or audio file not found in zip.");
        return;
    }

    const modelBlob = await modelFile.async("blob");
    const modelUrl = URL.createObjectURL(modelBlob);

    const audioBlob = await audioFile.async("blob");
    audioUrl = URL.createObjectURL(new Blob([audioBlob], { type: "audio/mpeg" }));

    const container = await BABYLON.LoadAssetContainerAsync(modelUrl, scene, {
        pluginExtension: ".glb"
    });

    //const audioEngine = await BABYLON.CreateAudioEngineAsync();

    container.addAllToScene();
    animationGroups = container.animationGroups;

    scene.executeWhenReady(() => {
        let min = new BABYLON.Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
        let max = new BABYLON.Vector3(Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE);

        container.meshes.forEach(mesh => {
            if (!mesh.getBoundingInfo) return;
            const meshMin = mesh.getBoundingInfo().boundingBox.minimumWorld;
            const meshMax = mesh.getBoundingInfo().boundingBox.maximumWorld;

            min = BABYLON.Vector3.Minimize(min, meshMin);
            max = BABYLON.Vector3.Maximize(max, meshMax);
        });

        const center = min.add(max).scale(0.5);
        const size = max.subtract(min).length();

        const camera = scene.activeCamera;
        if (camera) {
            camera.setTarget(center);

            const cameraOffset = new BABYLON.Vector3(0, size * 0.5, -size * 2);
            camera.position = center.add(cameraOffset);
        }
    });

    animationGroups = animationGroups.filter(group => !group.name.startsWith("Key"));
    animationGroups.forEach(group => {
        group.stop();
        group.reset();
    });

    animationSelect.innerHTML = "";
    if (animationGroups.length > 0) {
        currentAnim = animationGroups[0];
        animationGroups.forEach((group, _) => {
            const option = document.createElement("option");
            option.value = group.name;
            option.textContent = group.name;
            animationSelect.appendChild(option);
        });
    }
}

function setupControls() {
    animationSelect.addEventListener("change", () => {
        const selectedName = animationSelect.value;
        const selectedGroup = animationGroups.find(g => g.name === selectedName);

        if (currentAnim) currentAnim.stop();
        currentAnim = selectedGroup;
        currentAnim.reset();
    });

    document.getElementById("playBtn").addEventListener("click", async () => {
        if (!currentAnim || !audioUrl) return;

        if (!audioEngine) {
            audioEngine = await BABYLON.CreateAudioEngineAsync();
            song = await BABYLON.CreateStreamingSoundAsync("narration", audioUrl, scene);
            await audioEngine.unlockAsync();
        }

        if (!BABYLON.Engine.audioEngine) {
            BABYLON.Engine.audioEngine = new BABYLON.AudioEngine();
        }

        const ctx = BABYLON.Engine.audioEngine.audioContext;
        if (ctx && ctx.state === "suspended") {
            try {
                await ctx.resume();
            } catch (e) {
                console.warn("AudioContext resume failed:", e);
            }
        }
        currentAnim.play(true);
        song.play();
    });

    document.getElementById("pauseBtn").addEventListener("click", () => {
        if (currentAnim) currentAnim.pause();
        if (song) song.pause();
    });

    document.getElementById("resetBtn").addEventListener("click", () => {
        if (currentAnim) {
            currentAnim.reset();
            currentAnim.stop();
        }
        if (song) song.stop();
    });
}

document.getElementById("loadZipBtn").addEventListener("click", async () => {
    const input = document.getElementById("zipUrlInput");
    const zipDirectUrl = input.value.trim();

    if (!zipDirectUrl) {
        alert("Please enter a valid ZIP URL.");
        return;
    }

    // Load the ZIP file directly from the URL, it can be passed dynamically. Using FileBrowser API for testing.
    const proxyUrl = "http://localhost:3000/proxy-zip?url=";
    await loadZipFromUrl(proxyUrl, zipDirectUrl);
});

(async function () {
    await initBabylon();
    setupControls();
    // Load the ZIP file directly from the URL, it can be passed dynamically. Using FileBrowser API for testing.
    /*const proxyUrl = "http://localhost:3000/proxy-zip?url=";
    const zipDirectUrl = "http://localhost:59020/api/public/dl/6pqI-N0W";
    await loadZipFromUrl(proxyUrl, zipDirectUrl);*/
})();