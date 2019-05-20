import React, {Component} from 'react';
import {
  Container,
  Left,
  Right, 
  Icon, 
  Button,
  Item, 
  Input, 
  ListItem,
  Text,
  ActionSheet
} from "native-base"
import {View, AsyncStorage, Alert, FlatList} from "react-native"
import Nav from "./../components/Nav"
import {server, timeout} from "./../Accessible"
import axios from "axios"
import Loading from "./../components/Loading"
import Network from "./../components/Network"
import NoData from "./../components/NoData"
import update from "immutability-helper"

class Tracks extends Component {
  
  constructor() {
    super()
    this.state = {
      loading: true,
      error: false,
      rooms: [],
      copy: [],
      token: null,
      user: null
    }
    this.mounted = false
  }

  fetchData = async () => {
    this.setState({ loading: true })
      await axios.get(server + "api/rooms/tracks", this.state.token, {timeout: 1000})
      .then(response => {
        if( this.mounted ) {
          this.setState({ loading: false, rooms: response.data.response, error: false, copy: response.data.response })
        }
      })
      .catch(error => {
        if( this.mounted ) {
          this.setState({ loading: false, error: true})
        }
      })
  }

  startMount = async () => {
    const token = await AsyncStorage.getItem("token")
    if( token ) {
      const json = JSON.parse( token )
      if(this.mounted) {
        this.setState({ token: {headers: {"Authorization": "Bearer " + json.response.token}}, user: json.user })
        this.fetchData()
      }
    }
  }

  componentDidMount() {
    this.mounted = true
    if( this.mounted ) {
      this.startMount()
    }
  }

  componentWillUnmount() {
    this.mounted = false
  }

  copyIndex = (id) => {
    return this.state.copy.findIndex(item => item.id == id)
  }

  componentDidUpdate(props) {
    const e = this
    if(props.navigation.state.params != e.props.navigation.state.params) {
      if(e.props.navigation.state.params.saved) {
        const event = e.props.navigation.state.params.event
        const key = e.props.navigation.state.params.key
        const saveparams = e.props.navigation.state.params.saved
        if( event == "insert" ) {
          const newData = [...e.state.rooms, saveparams]
          const copy = [...e.state.copy, saveparams]
          e.setState({ rooms: newData, copy })
        } else {
          const index = this.copyIndex(saveparams.id)
          this.setState((state) => {
            return {
              rooms: update(state.rooms, {
                [key]: {$set: saveparams}
              }),
              copy: update(state.copy, {
                [index]: {$set: saveparams}
              })
            }
          })
        }
      }
    }
  }

  notify = ( message ) => {
    Alert.alert("Message", message)
  }

  remove = ( id, key ) => {
    axios.get(server + "api/rooms/removev2?option=tracks&id=" + id, this.state.token, timeout)
    .then(response => {
      this.notify("Successfully removed.")
      const refresh = [...this.state.rooms]
      refresh.splice(key, 1)
      
      const copy = [...this.state.copy]
      copy.splice(this.copyIndex(id), 1)
      this.setState({ rooms: refresh, copy })
    })
    .catch(error => {
      this.notify("Please check your internet connection.")
    })
  }

  executeOption = ( index, row, key )=> {
    switch(index)
    {
      case 0:
      // Redirect View1
      this.props.navigation.navigate("Strands", { track: row })
      break;

      case 1:
      // Edit Form
      this.props.navigation.navigate("TracksForm", { inputs: row, key })
      break;

      case 2:
      // Delete
      Alert.alert("Confirm Delete", "Are you sure you want to remove?", [
        { text: "Confirm", onPress: () => this.remove( row.id, key )},
        { text: "Cancel" }
      ])
      break;
    }
  }

  mutate = () => {
      return {
          id: 0,
          tracks: ""
      }
  }

  search = txt => {
    let text = txt.toLowerCase()
    let rooms = this.state.copy
    let filteredRooms = rooms.filter(item => {
      if(item.tracks.toLowerCase().match(text)) {
        return item;
      }
    })
    this.setState({ rooms: filteredRooms })
  }

  render() {

    const {loading, error, rooms, user} = this.state

    return (
      <Container>
        <Nav 
        title={"Tracks"}
        left={{ icon: "sync", onPress: () => this.fetchData() }}
        right={{ icon: "live-help", onPress: () => this.props.navigation.navigate("HelpDesk") }}
        />
        {
          loading ? (<Loading text={"Loading"} />) :
          (
            error ? (<Network />):
            (
              <View style={{ flex: 1 }}>
                <View style={{ padding: 13 }}>
                  <Item regular style={{ padding: 2 }}>
                    <Input onChangeText={(txt) => this.search(txt)} placeholder={"Search track"} />
                    <Icon active name={"search"} />
                  </Item>
                </View>
                {
                  rooms.length ? (
                  <FlatList
                  keyboardShouldPersistTaps={'handled'}
                  removeClippedSubviews={false}
                  data={rooms}
                  keyExtractor={item => 'list-item-tracks-' + item.id}
                  renderItem={({ item, index }) => (
                    <RoomsList 
                    dataSource={item}
                    exec={(optionIndex) => this.executeOption( optionIndex, item, index )}
                    isAdmin={user.role == 1 ? true : false}
                    />
                  )}
                  />
                  ) : (<NoData text={"No track record."} />)
                }
                
                {
                    user.role == 1 && (
                        <View style={{ padding: 13 }}>
                            <Button style={{ elevation: 0 }} block color={"primary"} onPress={() => this.props.navigation.navigate("TracksForm", { inputs: this.mutate(), key: 0 }) }>
                                <Text>New Track</Text>
                            </Button>
                        </View>
                    )
                }
              </View>
            )
          )
        }
      </Container>
    )
  }
}

const options = ["Go to this track", "Edit track", "Delete track", "Cancel"]
const option2 = ["Go to this track", "Cancel"]

const RoomsList = ( props ) => (
  <ListItem onPress={() => ActionSheet.show(
    {
      options: props.isAdmin ? options : option2,
      cancelButtonIndex: 3,
      destructiveButtonIndex: 3,
      title: "Choose option"
    },
    index => props.exec( index )
  )}
  >
    <Left>
      <Text>{props.dataSource.tracks}</Text>
    </Left>
    <Right>
      <Icon name={"chevron-right"} />
    </Right>
  </ListItem>
)

export default Tracks