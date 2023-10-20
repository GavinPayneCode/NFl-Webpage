import React from "react";

function NavBar(props) {
  //grabbing variables from props
  const { handleSort, toggleSortValue, handleSearch } = props;

  return (
    <nav
      className="navbar bg-dark border-bottom border-body position-fixed w-100"
      style={{ zIndex: "1" }}
      data-bs-theme="dark"
    >
      <div className="container-fluid">
        <a className="navbar-brand" href="/">
          <img
            src="https://upload.wikimedia.org/wikipedia/en/thumb/a/a2/National_Football_League_logo.svg/1200px-National_Football_League_logo.svg.png"
            alt="logo"
            width="40"
            height="50"
          />
          NFL Players
        </a>
        <div className="d-grid gap-3 d-flex ">
          <button
            type="button"
            className="btn btn-outline-danger"
            onClick={() => handleSort("playerObject.fullName")}
          >
            Sort by Name
          </button>
          <button
            type="button"
            className="btn btn-outline-danger"
            onClick={() => handleSort("playerObject.position.name")}
          >
            Sort by Position
          </button>
          <button
            type="button"
            className="btn btn-outline-danger"
            onClick={() => handleSort("playerObject.jersey")}
          >
            Sort by Jersey Number
          </button>
          <div
            className="form-check form-switch "
            style={{ marginLeft: "1rem", marginTop: ".5rem" }}
          >
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              id="flexSwitchCheckDefault"
              onClick={() => toggleSortValue()}
            />
            <label
              className="form-check-label text-white"
              htmlFor="flexSwitchCheckDefault"
            >
              Desend results
            </label>
          </div>
        </div>
        <form className="d-flex" role="search">
          <input
            className="form-control me-2"
            type="search"
            placeholder="Search Players"
            aria-label="Search"
            onChange={(e) => handleSearch(e)}
          />
        </form>
      </div>
    </nav>
  );
}

export default NavBar;
