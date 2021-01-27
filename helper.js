// async ... await GET
const getData = async () => {
    try {
        const response = await fetch("https://api-to-call.com/endpoint");
        if (response.ok) {
            const jsonResponse = await response.json();
            return jsonResponse;
        }
        throw new Error("Request failed!");
    } catch (error) {
        console.log(error);
    }
};

// async ... await POST
const postData = async () => {
    try {
        const response = await fetch("https://api-to-call.com/endpoint", {
            method: "POST",
            body: JSON.stringify({ id: 200 }),
        });

        if (response.ok) {
            const jsonResponse = await response.json();
            return jsonResponse;
        }
        throw new Error("Request failed!");
    } catch (error) {
        console.log(error);
    }
};

// make query string
const queryString = (obj) => {
    return Object.keys(obj).reduce((a, k) => { 
        if (obj[k] !== undefined) {
            a.push(k + '=' + encodeURIComponent(obj[k]))
        } 
        return a 
    }, []).join( '&' );
}