document.addEventListener('DOMContentLoaded', function() {
    // Manipulação do dropdown de tipo de contrato
    const filterTipo = document.getElementById('filter-tipo');
    const tipoContratoSelect = filterTipo.querySelector('select');

    if (filterTipo && tipoContratoSelect) {
        tipoContratoSelect.addEventListener('change', function() {
            filterTipo.querySelector('span:first-child').textContent = this.options[this.selectedIndex].text;
        });
    }

    // Manipulação do dropdown de UF
    const filterLocal = document.getElementById('filter-local');
    const ufSelect = filterLocal.querySelector('select');

    if (filterLocal && ufSelect) {
        ufSelect.addEventListener('change', function() {
            filterLocal.querySelector('span:first-child').textContent = this.options[this.selectedIndex].text;
        });
    }

    // Manipulação do dropdown de educação
    const filterEducacao = document.getElementById('filter-educacao');
    const escolaridadeSelect = filterEducacao.querySelector('select');

    if (filterEducacao && escolaridadeSelect) {
        escolaridadeSelect.addEventListener('change', function() {
            filterEducacao.querySelector('span:first-child').textContent = this.options[this.selectedIndex].text;
        });
    }
}); 