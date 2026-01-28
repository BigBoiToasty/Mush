fetch("https://api.tcgdex.net/v2/en/cards/swsh3-136")
    .then(response => {
        if(!response.ok)
            throw new Error("could not fetch resource")
        return response.json()
    })
    .then(data => console.log(data.name))
    .catch(error => console.error(error));

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
            pokeImage = document.createElement("img")
            pokeImage.src = element.image + "/high.webp";
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

function selectPoke(){
    const pokegallery = document.getElementById('pokeGallery');
    const selectgallery = document.getElementById('box');
    pokegallery.innerHTML = "";
    event.target.addEventListener("click", removePoke);
    selectgallery.appendChild(event.target);
    choosePoke();
    toggleVisibility(document.getElementById("buttonCard"));

}

function removePoke(){
    const selectgallery = document.getElementById(event.target.parentElement);
    selectgallery.removeChild(event.target);
}

function binderSelect(){

}

function toggleVisibility(element){
    if(element.hasAttribute("hidden"))
        element.removeAttribute("hidden");
    else
        element.setAttribute("hidden", "hidden");

}

function choosePoke(){
    toggleVisibility(document.getElementById("pokeGallery"));
    toggleVisibility(document.getElementById("search"));
    toggleVisibility(document.getElementById("selectedGallery"));
}