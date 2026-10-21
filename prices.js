(function () {
    "use strict";

    var config = window.TTS_SUPABASE || {};
    if (!config.url || !config.anonKey) return;

    function formatPrice(value) {
        return new Intl.NumberFormat("ru-RU").format(value).replace(/\u00a0/g, " ") + " сом";
    }

    function normalize(value) {
        return String(value || "").trim().replace(/\s+/g, " ");
    }

    fetch(config.url.replace(/\/$/, "") + "/rest/v1/prices?select=category,name,price&order=sort_order.asc", {
        headers: {
            apikey: config.anonKey,
            Authorization: "Bearer " + config.anonKey
        }
    })
        .then(function (response) {
            if (!response.ok) throw new Error("Не удалось загрузить цены");
            return response.json();
        })
        .then(function (rows) {
            if (!rows.length) return;

            document.querySelectorAll(".price-group").forEach(function (group) {
                var categoryNode = group.querySelector(".price-group-heading strong");
                var minimumNode = group.querySelector(".price-group-heading span");
                var category = normalize(categoryNode && categoryNode.textContent);
                var categoryRows = rows.filter(function (row) { return normalize(row.category) === category; });

                group.querySelectorAll(".price-table > div").forEach(function (item) {
                    var nameNode = item.querySelector("span");
                    var priceNode = item.querySelector("strong");
                    var row = categoryRows.find(function (candidate) {
                        return normalize(candidate.name) === normalize(nameNode && nameNode.textContent);
                    });
                    if (row && priceNode) priceNode.textContent = formatPrice(row.price);
                });

                if (categoryRows.length && minimumNode) {
                    minimumNode.textContent = "от " + formatPrice(Math.min.apply(null, categoryRows.map(function (row) { return row.price; })));
                }
            });

            document.querySelectorAll(".route-card").forEach(function (card) {
                var nameNode = card.querySelector("span");
                var priceNode = card.querySelector("strong");
                var row = rows.find(function (candidate) {
                    return normalize(candidate.name) === normalize(nameNode && nameNode.textContent);
                });
                if (row && priceNode) priceNode.textContent = formatPrice(row.price);
            });
        })
        .catch(function (error) {
            console.warn("Используются резервные цены из HTML:", error.message);
        });
})();
