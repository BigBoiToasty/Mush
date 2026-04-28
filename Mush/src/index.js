import { getCards, saveCards, deleteCard, getBinders, createBinders } from './cards'
import { supabase } from './supabaseClient'


var crutch;
let activeBinderId = 1;
let activePage = 1;
let activeSlot = null;
let activeUser = null; //Replace with SUPERBASE AUTH

//Authentication

async function showApp(user) {
    activeUser = user;
    document.getElementById('authContainer').setAttribute('hidden', 'hidden');
    document.getElementById('appContainer').removeAttribute('hidden');
    await loadBinders();
    //loadBinderCards();
}

function showAuth() {
    activeUser = null;
    document.getElementById('appContainer').setAttribute('hidden', 'hidden');
    document.getElementById('authContainer').removeAttribute('hidden');
}

function showAuthError(message) {
    const err = document.getElementById('authError');
    err.textContent = message;
    err.removeAttribute('hidden');
}

async function handleLogin() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
 
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return showAuthError(error.message);
    showApp(data.user);
}

async function handleSignup() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
 
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return showAuthError(error.message);
 
    // Supabase sends a confirmation email by default.
    // If you have email confirmation disabled in your Supabase project,
    // data.user will be set and we can log them in immediately.
    if (data.user && data.session) {
        showApp(data.user);
    } else {
        showAuthError('Check your email to confirm your account, then log in.');
    }
}
 
async function handleLogout() {
    await supabase.auth.signOut();
    showAuth();
}
// Binder

async function loadBinders() {
    const binders = await getBinders(activeUser.id);
    const select = document.getElementById('binderSelect');
    select.innerHTML = '';
 
    if (binders.length === 0) {
        // New user — create a default binder for them automatically
        const binder = await createBinders('My Binder', activeUser.id);
        if (binder) {
            const option = document.createElement('option');
            option.value = binder.id;
            option.textContent = binder.name;
            select.appendChild(option);
            activeBinderId = binder.id;
        }
    } else {
        binders.forEach(binder => {
            const option = document.createElement('option');
            option.value = binder.id;
            option.textContent = binder.name;
            select.appendChild(option);
        });
        activeBinderId = binders[0].id;
        select.value = activeBinderId;
    }
 
    activePage = 1;
    await loadBinderCards();
}

async function handleCreateBinder() {
    const input = document.getElementById('newBinderName');
    const name = input.value.trim();
    if (!name) return;
 
    const binder = await createBinders(name, activeUser.id);
    if (!binder) return;
 
    input.value = '';
 
    const select = document.getElementById('binderSelect');
    const option = document.createElement('option');
    option.value = binder.id;
    option.textContent = binder.name;
    select.appendChild(option);
    select.value = binder.id;
 
    activeBinderId = binder.id;
    activePage = 1;
    await loadBinderCards();
}

async function handleBinderSwitch() {
    activeBinderId = parseInt(document.getElementById('binderSelect').value);
    activePage = 1;
    await loadBinderCards();
}

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

// Card search

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
    toggleVisibility(document.getElementById("pageControls"));
}

function closePokeSearch(){
    toggleVisibility(document.getElementById("pokeGallery"));
    toggleVisibility(document.getElementById("search"));
    document.getElementById("testGallery").classList.toggle("hidden");
    toggleVisibility(document.getElementById("pageControls"));
}

// Initialzie Page

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById("searchButton").addEventListener('click', fetchPoke);
    document.getElementById("prevPage").addEventListener('click', handlePrevPage);
    document.getElementById("nextPage").addEventListener('click', handleNextPage);
    
    document.getElementById("loginButton").addEventListener('click', handleLogin);
    document.getElementById("signupButton").addEventListener('click', handleSignup);
    document.getElementById("logoutButton").addEventListener('click', handleLogout);

    document.getElementById("createBinderButton").addEventListener('click', handleCreateBinder);
    document.getElementById("binderSelect").addEventListener('change', handleBinderSwitch);


    //await loadBinderCards();
    const { data } = await supabase.auth.getSession();
    if (data.session) {
        showApp(data.session.user);
    } else {
        showAuth();
    }

    toggleVisibility(document.getElementById("pageControls"));

});
