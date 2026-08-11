// Example starter JavaScript for disabling form submissions if there are invalid fields
(() => {
    'use strict'

    // Fetch all the forms we want to apply custom Bootstrap validation styles to
    const forms = document.querySelectorAll('.needs-validation')

    // Loop over them and prevent submission
    Array.from(forms).forEach(form => {
        form.addEventListener('submit', event => {
            if (!form.checkValidity()) {
                event.preventDefault()
                event.stopPropagation()
            }

            form.classList.add('was-validated')
        }, false)
    })
})()

// Filter bar — active state toggle
document.querySelectorAll('.filter').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter').forEach(f => f.classList.remove('active'));
        btn.classList.add('active');
    });
});

// ── Search Suggestions Autocomplete ──────────────────────────────────────────
(() => {
    const searchInput = document.getElementById("navSearchInput");
    const suggestionsBox = document.getElementById("navSearchSuggestions");
    if (!searchInput || !suggestionsBox) return;

    let debounceTimer;
    let selectedIndex = -1;

    const hideSuggestions = () => {
        suggestionsBox.style.display = "none";
        suggestionsBox.innerHTML = "";
        selectedIndex = -1;
    };

    const fetchSuggestions = async (query) => {
        if (!query.trim()) {
            hideSuggestions();
            return;
        }

        try {
            const res = await fetch(`/listings/suggestions?q=${encodeURIComponent(query)}`);
            if (!res.ok) return hideSuggestions();
            const suggestions = await res.json();

            if (suggestions.length === 0) {
                suggestionsBox.innerHTML = `
                    <div class="suggestion-item text-muted" style="cursor: default;">
                        <div class="suggestion-icon"><i class="fa-solid fa-magnifying-glass"></i></div>
                        <div class="suggestion-text">
                            <p class="suggestion-title">No matching listings</p>
                        </div>
                    </div>
                `;
                suggestionsBox.style.display = "block";
                return;
            }

            suggestionsBox.innerHTML = suggestions.map((item, idx) => `
                <a href="/listings/${item.id}" class="suggestion-item" data-index="${idx}">
                    ${item.image 
                        ? `<img src="${item.image}" class="suggestion-img" alt="${item.title}">`
                        : `<div class="suggestion-icon"><i class="fa-solid fa-location-dot"></i></div>`
                    }
                    <div class="suggestion-text">
                        <p class="suggestion-title">${item.title}</p>
                        <p class="suggestion-subtitle"><i class="fa-solid fa-location-dot me-1"></i>${item.location}</p>
                    </div>
                </a>
            `).join("");

            suggestionsBox.style.display = "block";
            selectedIndex = -1;
        } catch (err) {
            hideSuggestions();
        }
    };

    searchInput.addEventListener("input", (e) => {
        clearTimeout(debounceTimer);
        const query = e.target.value;
        debounceTimer = setTimeout(() => fetchSuggestions(query), 200);
    });

    searchInput.addEventListener("focus", (e) => {
        if (e.target.value.trim()) {
            fetchSuggestions(e.target.value);
        }
    });

    // Keyboard Navigation & Escape
    searchInput.addEventListener("keydown", (e) => {
        const items = suggestionsBox.querySelectorAll(".suggestion-item[href]");
        if (items.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            selectedIndex = (selectedIndex + 1) % items.length;
            updateSelection(items);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            selectedIndex = (selectedIndex - 1 + items.length) % items.length;
            updateSelection(items);
        } else if (e.key === "Enter" && selectedIndex >= 0) {
            e.preventDefault();
            items[selectedIndex].click();
        } else if (e.key === "Escape") {
            hideSuggestions();
        }
    });

    const updateSelection = (items) => {
        items.forEach((item, idx) => {
            if (idx === selectedIndex) {
                item.classList.add("selected");
                item.scrollIntoView({ block: "nearest" });
            } else {
                item.classList.remove("selected");
            }
        });
    };

    // Close when clicking outside
    document.addEventListener("click", (e) => {
        if (!searchInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
            hideSuggestions();
        }
    });
})();