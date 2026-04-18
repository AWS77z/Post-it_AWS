document.getElementById("main").addEventListener("dblclick", async function (event) {
    const x = event.clientX;
    const y = event.clientY;
    const res = await fetch('/verif_connecte');
    if (res.status === 200) {
        document.getElementById("x").value = x;
        document.getElementById("y").value = y;
        document.querySelector(".overlay").style.display = "block";
    }
    else {
        window.location.href = "/connexion";
    }

})


function closePopup() {
    document.querySelector(".overlay").style.display = "none";
}

async function Sauvegarder(event) {

    event.preventDefault();

    const form = document.getElementById("Sauvegarder_Post-it");
    const data = {
        x: document.getElementById("x").value,
        y: document.getElementById("y").value,
        contenu: form.querySelector("textarea").value
    };


    const res = await fetch("/sauvegarde_post-it", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    });

    if (res.ok) {

        closePopup();
    }
    if (!res.ok) { closePopup(); alert("Erreur lors de la creation."); }

    return false;
}

const params = new URLSearchParams(window.location.search);


window.addEventListener("DOMContentLoaded", async () => {

    const res = await fetch('/afficher_postits_bd');
    const postits = await res.json();

    postits.forEach(p => {
        creer_post_it(p);
    });

});


if (params.get("error") === "9") {
    alert("Une Erreure est survenue lors de la creation du post it : un élément est manquant.");
}

function creer_post_it(p) {

    const div = document.createElement("div");
    div.className = "post_it";
    div.dataset.id = p.id;

    div.style.position = "absolute";
    div.style.left = p.position_x + "px";
    div.style.top = p.position_y + "px";

    div.style.width = "200px";
    div.style.height = "200px";

    div.style.background = "#fff8a6";
    div.style.border = "1px solid #e0d36b";
    div.style.borderRadius = "10px";
    div.style.boxShadow = "0 4px 10px rgba(0,0,0,0.2)";
    div.style.padding = "10px";
    div.style.overflowY = "auto";
    div.style.whiteSpace = "pre-wrap";
    div.style.wordBreak = "break-word";
    div.style.overflowX = "hidden";

    div.style.fontFamily = "Arial";


    const btn = document.createElement("button");
    btn.textContent = "✖";

    btn.style.position = "absolute";
    btn.style.padding = "0px"
    btn.style.margin = "0px"
    btn.style.top = "1px";
    btn.style.right = "5px";
    btn.style.width = "20%";


    btn.style.border = "none";
    btn.style.background = "transparent";
    btn.style.cursor = "pointer";
    btn.style.fontSize = "30px";
    btn.style.color = "black";
    btn.onmouseover = () => {
        btn.style.color = "red";
        btn.style.transform = "scale(1.2)";

    };

    btn.onmouseout = () => {
        btn.style.color = "black";
        btn.style.transform = "scale(1)";
    };
    btn.onclick = async (e) => {
        e.stopPropagation();

        if (!confirm("Supprimer ce post-it ?")) return;

        try {
            console.log(window.user)
            console.log(p)

            const res = await fetch(`/delete_postit/${p.id}`, {
                method: "DELETE"
            });

            if (!res.ok) alert("Erreur lors de la suppression.");

        } catch (err) {
            console.error(err);
        }

    };
    const editBtn = document.createElement("button");
    editBtn.textContent = "✏️";
    editBtn.style.position = "absolute";
    editBtn.style.padding = "0px"
    editBtn.style.margin = "0px"
    editBtn.style.top = "1px";
    editBtn.style.left = "5px";
    editBtn.style.width = "20%";
    editBtn.style.border = "none";
    editBtn.style.background = "transparent";
    editBtn.style.cursor = "pointer";
    editBtn.style.fontSize = "30px";
    editBtn.onmouseover = () => {
        editBtn.style.color = "red";
        editBtn.style.transform = "scale(1.2)";

    };
    editBtn.onmouseout = () => {
        editBtn.style.color = "black";
        editBtn.style.transform = "scale(1)";
    }



    const text = document.createElement("div");
    text.textContent = p.contenu;

    editBtn.onclick = async () => {
        const nouveauTexte = prompt("Modifier votre message :", text.textContent);

        if (nouveauTexte !== null && nouveauTexte.trim() !== "") {
            const res = await fetch(`/update_postit/${p.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contenu: nouveauTexte })
            });

            if (!res.ok) alert("Erreur lors de la modification");
        }


    };

    text.style.marginTop = "30px";
    const signature = document.createElement("div");
    const dateObjet = new Date(p.date);
    const dateFr = dateObjet.toLocaleDateString('fr-FR');
    signature.textContent = "Le " + dateFr + " par " + p.auteur + ".";
    signature.style.marginTop = "5px";

    if (window.user && window.user.pseudo === p.auteur) {
        console.log(window.user, p)
        console.log(p)
        div.appendChild(btn);
        div.style.border = "2px solid #d4af37";
        div.style.boxShadow = "0 0 10px rgba(212, 175, 55, 0.6)";



        div.appendChild(editBtn);
        rendreDraggable(div);
    }

    div.appendChild(text);
    div.appendChild(signature);



    document.getElementById("main").appendChild(div);


}



const socket = io();
socket.on("new-postit", (postit) => {
    creer_post_it(postit);
});



socket.on("delete-postit", (id) => {
    const el = document.querySelector(`[data-id="${id}"]`);
    if (el) el.remove();
});

socket.on("update-postit", (data) => {
    const ancien = document.querySelector(`[data-id="${data.id}"]`);

    if (ancien) {

        ancien.remove();
        creer_post_it(data);
    }
});



function rendreDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

    element.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e.preventDefault();

        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        element.style.top = (element.offsetTop - pos2) + "px";
        element.style.left = (element.offsetLeft - pos1) + "px";
    }

    async function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
        const id = element.getAttribute('data-id');
        const x = parseInt(element.style.left);
        const y = parseInt(element.style.top);
        const response = await fetch(`/update_position/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ x, y })
        });

        if (response.status === 403) {
            alert("Impossible de deplacer ce postit");
            location.reload();
        }
    }


}

    socket.on("postit_bouge", (data) => {
        const el = document.querySelector(`.post_it[data-id='${data.id}']`);
        if (el) {
            el.style.left = data.x + "px";
            el.style.top = data.y + "px";

        }
    });
if (params.get("error") === "password") {
        alert("Mot de passe trop faible (8 caractères, majuscule, minuscule, chiffre, symbole requis)");
    }