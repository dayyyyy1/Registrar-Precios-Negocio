(function () {
  "use strict";

  var STORAGE_KEY = "registro-precios-data";
  var DEFAULT_CATEGORIES = ["Fruta", "Verdura", "Abarrotes", "Refrescos"];
  var UNITS = ["kg", "pieza", "unidad"];
  var CATEGORY_HEX = {
    Fruta: "#E63946",
    Verdura: "#D6336C",
    Abarrotes: "#AD1457",
    Refrescos: "#7B2D8E"
  };
  var FALLBACK_HEX = "#4A2377";

  function categoryHex(cat) {
    return CATEGORY_HEX[cat] || FALLBACK_HEX;
  }

  // ---- estado ----
  var state = {
    items: [],
    customCategories: [],
    filter: "Todas",
    searchTerm: "",
    editingId: null
  };

  function getCategories() {
    var extra = state.customCategories.filter(function (c) {
      return DEFAULT_CATEGORIES.indexOf(c) === -1;
    });
    return DEFAULT_CATEGORIES.concat(extra);
  }

  // ---- persistencia (localStorage: vive en este navegador/dispositivo) ----
  function load() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        state.items = parsed.items || [];
        state.customCategories = parsed.customCategories || [];
      }
    } catch (e) {
      showError("No se pudo leer lo guardado. Empezamos desde cero.");
    }
  }

  function save() {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ items: state.items, customCategories: state.customCategories })
      );
      hideError();
    } catch (e) {
      showError("No se pudo guardar. Intenta de nuevo.");
    }
  }

  function showError(msg) {
    var box = document.getElementById("errorBox");
    box.textContent = msg;
    box.hidden = false;
  }
  function hideError() {
    var box = document.getElementById("errorBox");
    box.hidden = true;
  }

  // ---- helpers ----
  function uid() {
    return Date.now().toString() + Math.random().toString(36).slice(2, 7);
  }

  function getFilteredItems() {
    var term = state.searchTerm.trim().toLowerCase();
    return state.items
      .filter(function (it) {
        return state.filter === "Todas" || it.category === state.filter;
      })
      .filter(function (it) {
        return it.name.toLowerCase().indexOf(term) !== -1;
      });
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ---- render: opciones de categoria ----
  function renderCategoryOptions(selectEl, selected) {
    var categories = getCategories();
    selectEl.innerHTML = categories
      .map(function (c) {
        return '<option value="' + escapeHtml(c) + '"' + (c === selected ? " selected" : "") + ">" + escapeHtml(c) + "</option>";
      })
      .join("");
  }

  // ---- render: chips de filtro ----
  function renderFilterChips() {
    var container = document.getElementById("filterChips");
    var categories = ["Todas"].concat(getCategories());
    container.innerHTML = categories
      .map(function (c) {
        var active = c === state.filter;
        var dot = c !== "Todas"
          ? '<span class="dot" style="background:' + categoryHex(c) + '"></span>'
          : "";
        return (
          '<button type="button" class="chip' + (active ? " active" : "") + '" data-filter="' +
          escapeHtml(c) + '">' + dot + escapeHtml(c) + "</button>"
        );
      })
      .join("");
  }

  // ---- render: totales ----
  function renderTotals(filteredItems) {
    var count = filteredItems.length;
    document.getElementById("countLabel").textContent =
      count + (count === 1 ? " producto" : " productos");
    var total = filteredItems.reduce(function (sum, it) { return sum + it.price; }, 0);
    document.getElementById("totalLabel").textContent = "TOTAL $" + total.toFixed(2);
  }

  // ---- render: lista de productos ----
  function renderItemView(item) {
    return (
      '<div class="item-view">' +
        '<div class="item-info">' +
          '<div class="item-name-row">' +
            '<span class="item-name">' + escapeHtml(item.name) + "</span>" +
            '<span class="item-category"><span class="dot" style="width:8px;height:8px;border-radius:50%;display:inline-block;background:' +
              categoryHex(item.category) + '"></span>' + escapeHtml(item.category) + "</span>" +
          "</div>" +
          '<div class="item-qty">' + item.quantity + " " + escapeHtml(item.unit) + "</div>" +
        "</div>" +
        '<div class="item-actions">' +
          '<span class="item-price">$' + item.price.toFixed(2) + "</span>" +
          '<button type="button" class="icon-btn" data-action="edit" data-id="' + item.id + '" aria-label="Editar">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>' +
          "</button>" +
          '<button type="button" class="icon-btn danger" data-action="delete" data-id="' + item.id + '" aria-label="Borrar">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>' +
          "</button>" +
        "</div>" +
      "</div>"
    );
  }

  function renderItemEdit(item) {
    var categories = getCategories();
    var unitOptions = UNITS.map(function (u) {
      return '<option value="' + u + '"' + (u === item.unit ? " selected" : "") + ">" + u + "</option>";
    }).join("");
    var catOptions = categories
      .map(function (c) {
        return '<option value="' + escapeHtml(c) + '"' + (c === item.category ? " selected" : "") + ">" + escapeHtml(c) + "</option>";
      })
      .join("");
    return (
      '<div class="item-edit" data-id="' + item.id + '">' +
        '<input type="text" class="edit-name" value="' + escapeHtml(item.name) + '" />' +
        '<div class="edit-row">' +
          '<input type="number" step="0.01" class="edit-price mono" value="' + item.price + '" />' +
          '<input type="number" step="0.1" class="edit-quantity mono" value="' + item.quantity + '" />' +
          '<select class="edit-unit">' + unitOptions + "</select>" +
        "</div>" +
        '<select class="edit-category">' + catOptions + "</select>" +
        '<div class="edit-actions">' +
          '<button type="button" class="btn-gradient" data-action="save" data-id="' + item.id + '">Guardar</button>' +
          '<button type="button" class="btn-neutral" data-action="cancel" data-id="' + item.id + '">Cancelar</button>' +
        "</div>" +
      "</div>"
    );
  }

  function renderItemsList() {
    var container = document.getElementById("itemsList");
    var filtered = getFilteredItems();
    renderTotals(filtered);

    if (filtered.length === 0) {
      container.innerHTML =
        '<div class="empty-state">' +
        (state.items.length === 0
          ? "Aún no registras nada. Agrega tu primer producto arriba."
          : "No encontré nada con esa búsqueda.") +
        "</div>";
      return;
    }

    container.innerHTML = filtered
      .map(function (item) {
        var inner = state.editingId === item.id ? renderItemEdit(item) : renderItemView(item);
        return '<div class="item-card">' + inner + "</div>";
      })
      .join("");
  }

  function renderAll() {
    renderFilterChips();
    renderItemsList();
  }

  // ---- acciones ----
  function addItem(data) {
    state.items.unshift({
      id: uid(),
      name: data.name.trim(),
      price: parseFloat(data.price) || 0,
      quantity: parseFloat(data.quantity) || 1,
      unit: data.unit,
      category: data.category
    });
    save();
    renderAll();
  }

  function deleteItem(id) {
    state.items = state.items.filter(function (it) { return it.id !== id; });
    save();
    renderAll();
  }

  function startEdit(id) {
    state.editingId = id;
    renderItemsList();
  }

  function cancelEdit() {
    state.editingId = null;
    renderItemsList();
  }

  function saveEdit(id, container) {
    var name = container.querySelector(".edit-name").value.trim();
    var price = parseFloat(container.querySelector(".edit-price").value) || 0;
    var quantity = parseFloat(container.querySelector(".edit-quantity").value) || 1;
    var unit = container.querySelector(".edit-unit").value;
    var category = container.querySelector(".edit-category").value;

    state.items = state.items.map(function (it) {
      if (it.id !== id) return it;
      return {
        id: it.id,
        name: name || it.name,
        price: price,
        quantity: quantity,
        unit: unit,
        category: category
      };
    });
    state.editingId = null;
    save();
    renderAll();
  }

  function addCategory(name) {
    var trimmed = name.trim();
    if (!trimmed) return;
    if (getCategories().indexOf(trimmed) === -1) {
      state.customCategories.push(trimmed);
      save();
    }
    return trimmed;
  }

  // ---- init / listeners ----
  function init() {
    load();

    var formCategorySelect = document.getElementById("inputCategory");
    renderCategoryOptions(formCategorySelect, "Fruta");
    renderAll();

    // formulario: agregar producto
    document.getElementById("addForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var name = document.getElementById("inputName").value;
      var price = document.getElementById("inputPrice").value;
      if (!name.trim() || price === "") return;

      addItem({
        name: name,
        price: price,
        quantity: document.getElementById("inputQuantity").value,
        unit: document.getElementById("inputUnit").value,
        category: formCategorySelect.value
      });

      document.getElementById("inputName").value = "";
      document.getElementById("inputPrice").value = "";
      document.getElementById("inputQuantity").value = "1";
      renderCategoryOptions(formCategorySelect, formCategorySelect.value);
    });

    // mostrar/ocultar input de nueva categoria
    document.getElementById("btnToggleCategory").addEventListener("click", function () {
      var row = document.getElementById("addCategoryRow");
      row.hidden = !row.hidden;
    });

    document.getElementById("btnAddCategory").addEventListener("click", function () {
      var input = document.getElementById("inputNewCategory");
      var added = addCategory(input.value);
      if (added) {
        renderCategoryOptions(formCategorySelect, added);
        renderAll();
      }
      input.value = "";
      document.getElementById("addCategoryRow").hidden = true;
    });

    // buscador
    document.getElementById("searchInput").addEventListener("input", function (e) {
      state.searchTerm = e.target.value;
      renderItemsList();
    });

    // chips de filtro (delegacion)
    document.getElementById("filterChips").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-filter]");
      if (!btn) return;
      state.filter = btn.getAttribute("data-filter");
      renderAll();
    });

    // lista de productos (delegacion: editar / borrar / guardar / cancelar)
    document.getElementById("itemsList").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-action]");
      if (!btn) return;
      var action = btn.getAttribute("data-action");
      var id = btn.getAttribute("data-id");

      if (action === "edit") startEdit(id);
      else if (action === "delete") deleteItem(id);
      else if (action === "cancel") cancelEdit();
      else if (action === "save") {
        var container = btn.closest(".item-edit");
        saveEdit(id, container);
      }
    });

    // service worker (solo funciona si se sirve por http/https, no en file://)
    if ("serviceWorker" in navigator && (location.protocol === "http:" || location.protocol === "https:")) {
      navigator.serviceWorker.register("service-worker.js").catch(function () {
        // si falla, la app sigue funcionando normal, solo sin cache offline
      });
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
