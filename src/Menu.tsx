import { Link } from 'react-router-dom';

function Menu() {
  return (
    <nav className="menu">
      <Link to="/">Home</Link>
      <Link to="/feeds">Feeds</Link>
      <Link to="/deals">Deals</Link>
      <Link to="/chat">Chat</Link>
    </nav>
  );
}

export default Menu;