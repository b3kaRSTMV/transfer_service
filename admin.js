(function () {
    "use strict";

    var config = window.TTS_SUPABASE || {};
    var setupPanel = document.getElementById("setupPanel");
    var loginPanel = document.getElementById("loginPanel");
    var editorPanel = document.getElementById("editorPanel");
    var loginForm = document.getElementById("loginForm");
    var loginMessage = document.getElementById("loginMessage");
    var saveMessage = document.getElementById("saveMessage");
    var saveButton = document.getElementById("saveButton");
    var rows = [];

    function showMessage(node, text, type) {
        node.textContent = text;
        node.className = "message" + (type ? " " + type : "");
    }

    function slug(value) {
        return value.toLowerCase().replace(/ё/g, "е").replace(/[^a-zа-я0-9]+/gi, "-").replace(/^-|-$/g, "");
    }

    async function readPricesFromSite() {
        var response = await fetch("./index.html", {cache: "no-store"});
        var html = await response.text();
        var documentCopy = new DOMParser().parseFromString(html, "text/html");
        var result = [];
        var order = 0;
        documentCopy.querySelectorAll(".price-group").forEach(function (group) {
            var category = group.querySelector(".price-group-heading strong").textContent.trim();
            group.querySelectorAll(".price-table > div").forEach(function (item) {
                var name = item.querySelector("span").textContent.trim();
                var price = Number(item.querySelector("strong").textContent.replace(/\D/g, ""));
                result.push({id: slug(category) + "--" + slug(name), category: category, name: name, price: price, sort_order: order++});
            });
        });
        return result;
    }

    function renderEditor() {
        var container = document.getElementById("priceGroups");
        container.innerHTML = "";
        var categories = [];
        rows.forEach(function (row) { if (!categories.includes(row.category)) categories.push(row.category); });
        categories.forEach(function (category) {
            var section = document.createElement("section");
            section.className = "admin-group";
            var heading = document.createElement("h2");
            heading.textContent = category;
            section.appendChild(heading);
            rows.filter(function (row) { return row.category === category; }).forEach(function (row) {
                var line = document.createElement("div");
                line.className = "admin-row";
                var label = document.createElement("label");
                label.htmlFor = "price-" + row.id;
                label.textContent = row.name;
                var wrap = document.createElement("div");
                wrap.className = "price-input-wrap";
                var input = document.createElement("input");
                input.id = "price-" + row.id;
                input.type = "number";
                input.min = "0";
                input.step = "100";
                input.value = row.price;
                input.dataset.id = row.id;
                var unit = document.createElement("span");
                unit.textContent = "сом";
                wrap.append(input, unit);
                line.append(label, wrap);
                section.appendChild(line);
            });
            container.appendChild(section);
        });
    }

    async function loadEditor() {
        var result = await client.from("prices").select("id,category,name,price,sort_order").order("sort_order");
        if (result.error) throw result.error;
        rows = result.data.length ? result.data : await readPricesFromSite();
        renderEditor();
        loginPanel.hidden = true;
        editorPanel.hidden = false;
    }

    if (!config.url || !config.anonKey || !window.supabase) {
        setupPanel.hidden = false;
        return;
    }

    var client = window.supabase.createClient(config.url, config.anonKey);

    client.auth.getSession().then(function (result) {
        if (result.data.session) loadEditor().catch(function (error) { showMessage(loginMessage, error.message, "error"); });
        else loginPanel.hidden = false;
    });

    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        var button = loginForm.querySelector("button");
        button.disabled = true;
        showMessage(loginMessage, "Входим…");
        var result = await client.auth.signInWithPassword({email: document.getElementById("email").value.trim(), password: document.getElementById("password").value});
        button.disabled = false;
        if (result.error) return showMessage(loginMessage, "Неверный email или пароль.", "error");
        try { await loadEditor(); } catch (error) { showMessage(loginMessage, error.message, "error"); }
    });

    document.getElementById("logoutButton").addEventListener("click", async function () {
        await client.auth.signOut();
        editorPanel.hidden = true;
        loginPanel.hidden = false;
        loginForm.reset();
    });

    saveButton.addEventListener("click", async function () {
        saveButton.disabled = true;
        showMessage(saveMessage, "Сохраняем…");
        var updates = rows.map(function (row) {
            var input = document.querySelector('[data-id="' + CSS.escape(row.id) + '"]');
            return {id: row.id, category: row.category, name: row.name, price: Number(input.value), sort_order: row.sort_order};
        });
        var result = await client.from("prices").upsert(updates, {onConflict: "id"});
        saveButton.disabled = false;
        if (result.error) return showMessage(saveMessage, "Не удалось сохранить: " + result.error.message, "error");
        rows = updates;
        showMessage(saveMessage, "Готово. Цены на сайте обновлены.", "success");
    });
})();
