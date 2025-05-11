
          console.log("to testando")
    // Dropdown logic
    function setupDropdown(filterId, dropdownId) {
        const filter = document.getElementById(filterId);
        const dropdown = document.getElementById(dropdownId);
        filter.addEventListener('click', function(e) {
            e.stopPropagation();
            dropdown.classList.toggle('show');
        });
        filter.addEventListener('blur', function() {
            setTimeout(() => dropdown.classList.remove('show'), 100);
        });
        dropdown.querySelectorAll('li').forEach(option => {
            option.addEventListener('click', function(e) {
                e.stopPropagation();
                filter.querySelector('span').textContent = this.textContent;
                dropdown.classList.remove('show');
            });
        });
    }
    setupDropdown('filter-tipo', 'dropdown-tipo');
    setupDropdown('filter-local', 'dropdown-local');
    setupDropdown('filter-educacao', 'dropdown-educacao');
    document.addEventListener('click', function() {
        document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('show'));
    });
