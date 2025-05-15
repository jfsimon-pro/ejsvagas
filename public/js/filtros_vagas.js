document.addEventListener('DOMContentLoaded', function() {
    // Manipulação do dropdown de educação
    const filterEducacao = document.getElementById('filter-educacao');
    const dropdownEducacao = document.getElementById('dropdown-educacao');
    const escolaridadeInput = document.getElementById('escolaridade');

    if (filterEducacao && dropdownEducacao) {
        // Mostrar/esconder dropdown ao clicar
        filterEducacao.addEventListener('click', function(e) {
            e.stopPropagation();
            dropdownEducacao.style.display = dropdownEducacao.style.display === 'block' ? 'none' : 'block';
        });

        // Selecionar opção do dropdown
        dropdownEducacao.addEventListener('click', function(e) {
            if (e.target.tagName === 'LI') {
                const value = e.target.getAttribute('data-value');
                escolaridadeInput.value = value;
                console.log('Escolaridade selecionada:', value);
                filterEducacao.querySelector('span:first-child').textContent = e.target.textContent;
                dropdownEducacao.style.display = 'none';
            }
        });

        // Fechar dropdown ao clicar fora
        document.addEventListener('click', function(e) {
            if (!filterEducacao.contains(e.target)) {
                dropdownEducacao.style.display = 'none';
            }
        });

        // Adicionar evento de submit ao formulário para debug
        const form = document.querySelector('form.search-bar');
        if (form) {
            form.addEventListener('submit', function(e) {
                console.log('Valor da escolaridade sendo enviado:', escolaridadeInput.value);
                // Garantir que o valor da escolaridade seja enviado
                if (!escolaridadeInput.value) {
                    escolaridadeInput.value = '';
                }
            });
        }
    }

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
}); 