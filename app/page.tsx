import ClientPage from "./clientPage";

export const metadata = {
    title: "Aave Portfolio Simulator",
};

//thin server side wrapper for index page to allow meta data
export default function IndexPage() {
    return <ClientPage/>
};
