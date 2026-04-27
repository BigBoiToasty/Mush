import { getCards, saveCards, deleteCard } from './cards'

var crutch;
let activeBinderId = 1;
let activePage = 1;
let activeSlot = null;
let activeUser = null; //Replace with SUPERBASE AUTH

// Load cards for current page

async function loadBinderCards() {
    const gallery = document.getElementById('testGallery');
    gallery.innerHTML = '';
    binderSetup();

    const slots = await getCards(activeBinderId, activePage);
    slots.forEach(slot => {
        const box = gallery.children[slot.slot_number];
        if (!box) return;

        const img = document.createElement('img');
        img.src = slot.card_image;
        img.dataset.slotNumber = slot.slot_number;
        img.style.width = '225px';
        img.style.height = '315px';
        img.addEventListener('click', removePoke);

        box.appendChild(img);
        toggleVisibility(box.querySelector('button'));
    });

    document.getElementById('pageLabel').textContent = `Page ${activePage}`;
}

// Page controller

async function handlePrevPage() {
    if (activePage <= 1) return;
    activePage--;
    await loadBinderCards();
}

async function handleNextPage() {
    activePage++;
    await loadBinderCards();
}

// ── Card search ───────────────────────────────────────────────────────────────

async function fetchPoke(){
    try{        
        const pokemonName = document.getElementById("pokemonName").value.toLowerCase();
        document.getElementById("pokemonName").value = "";
        const response = await fetch(`https://api.tcgdex.net/v2/en/cards?name=${pokemonName}`);
        if(!response.ok)
            throw new Error("could not fetch resource")
        const data = await response.json();
        const gallery = document.getElementById('pokeGallery');
        gallery.innerHTML = "";
        data.forEach(element => {
            if (element.image == undefined)
                return
            let pokeImage = document.createElement("img")
            pokeImage.src = element.image + "/high.webp";
            pokeImage.dataset.cardId = element.id;
            pokeImage.dataset.cardImage = element.image + "/high.webp";
            pokeImage.style.width = '225px';
            pokeImage.style.height = '315px';
            pokeImage.addEventListener("click", selectPoke);
            gallery.appendChild(pokeImage);
        });
    }
    catch(error){
        console.log(error)
    }
}

async function selectPoke(event){
    const img = event.target;
    const pokegallery = img.parentElement;

    const selectgallery = crutch;
    pokegallery.innerHTML = "";

    img.removeEventListener("click", selectPoke);
    img.dataset.slotNumber = activeSlot;
    img.addEventListener("click", removePoke);

    selectgallery.appendChild(img);
    closePokeSearch();
    toggleVisibility(crutch.querySelector("button"));

    await saveCards({
        binder_id: activeBinderId,
        page_number: activePage,
        slot_number: activeSlot,
        card_id: img.dataset.cardId,
        card_image: img.dataset.cardImage
    });
}

async function removePoke(event){
    const img = event.target;
    const box = img.parentElement;
    const slotNumber = parseInt(img.dataset.slotNumber);

    box.removeChild(img);
    toggleVisibility(box.querySelector("button"));

    await deleteCard(activeBinderId, activePage, slotNumber);
}

// Binder grid

function binderSetup(){
    const selectedGallery = document.getElementById("testGallery");
    selectedGallery.innerHTML = '';
    for(let i = 0; i <= 8; i++){
        const box = document.createElement("div");
        box.classList.add('box');
        box.dataset.slot = i;

        const buttonCard = document.createElement("button");
        buttonCard.innerHTML = "Choose Pokemon";
        buttonCard.classList.add("button")
        buttonCard.addEventListener("click", choosePoke);
        box.appendChild(buttonCard);
        selectedGallery.appendChild(box);
    }
}

function toggleVisibility(element){
    if (!element) 
        return
    if(element.hasAttribute("hidden"))
        element.removeAttribute("hidden");
    else
        element.setAttribute("hidden", "hidden");
}

function choosePoke(event){
    crutch = event.target.parentElement;
    activeSlot = parseInt(crutch.dataset.slot);

    toggleVisibility(document.getElementById("pokeGallery"));
    toggleVisibility(document.getElementById("search"));
    document.getElementById("testGallery").classList.toggle("hidden");
}

function closePokeSearch(){
    toggleVisibility(document.getElementById("pokeGallery"));
    toggleVisibility(document.getElementById("search"));
    document.getElementById("testGallery").classList.toggle("hidden");
}

// Initialzie Page

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById("searchButton").addEventListener('click', fetchPoke);
    document.getElementById("prevPage").addEventListener('click', handlePrevPage);
    document.getElementById("nextPage").addEventListener('click', handleNextPage);

    await loadBinderCards();
});
